import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import styles from '../Dashboard.module.css'
import {
  CATEGORY_COLORS,
  buildCategories,
  formatBRL,
  isExpense,
  monthKey,
  parseAmount,
  parseTransactionDate,
} from '../lib/finance'

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

function formatDateBR(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

export function MonthlyReport({ transactions, user }) {
  const currentKey = monthKey(new Date())
  const [selected, setSelected] = useState(currentKey)
  const year = Number(selected.slice(0, 4))
  const monthIndex = Number(selected.slice(5, 7)) - 1

  const monthData = useMemo(() => {
    const list = transactions
      .filter((transaction) => monthKey(parseTransactionDate(transaction.date)) === selected)
      .map((transaction) => ({ ...transaction, parsedDate: parseTransactionDate(transaction.date) }))
      .sort((a, b) => a.parsedDate - b.parsedDate)
    let receitas = 0
    let despesas = 0
    list.forEach((transaction) => {
      const amount = Math.abs(parseAmount(transaction))
      if (isExpense(transaction)) despesas += amount
      else receitas += amount
    })
    return { list, receitas, despesas, saldo: receitas - despesas, categories: buildCategories(list) }
  }, [transactions, selected])

  const go = (offset) => {
    const key = monthKey(new Date(year, monthIndex + offset, 1))
    if (key > currentKey) return
    setSelected(key)
  }

  return (
    <section className={styles.reportPage}>
      <div className={`${styles.reportToolbar} ${styles.noPrint}`}>
        <div>
          <h2 className={styles.reportTitle}>Relatório mensal</h2>
          <p className={styles.reportSub}>Consolidado do mês pronto para baixar em PDF.</p>
        </div>
        <div className={styles.reportActions}>
          <button className={styles.reportMonthBtn} onClick={() => go(-1)} aria-label="Mês anterior">
            ‹
          </button>
          <span className={styles.reportMonth}>
            {MONTH_NAMES[monthIndex]} de {year}
          </span>
          <button className={styles.reportMonthBtn} onClick={() => go(1)} disabled={selected >= currentKey} aria-label="Próximo mês">
            ›
          </button>
          <button className={styles.reportDownload} onClick={() => window.print()}>
            Baixar PDF
          </button>
        </div>
      </div>

      <article className={styles.reportSheet}>
        <header className={styles.reportSheetHead}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>✦</span>
            <span className={styles.logoText}>
              FinAI<small className={styles.logoSub}>Automação Financeira</small>
            </span>
          </div>
          <div className={styles.reportSheetMeta}>
            <b>
              Relatório mensal — {MONTH_NAMES[monthIndex]} de {year}
            </b>
            <small>
              Gerado em {formatDateBR(new Date())} · {user.fullName}
            </small>
          </div>
        </header>

        <div className={styles.reportSummary}>
          <div className={styles.reportStat}>
            <span>Receitas</span>
            <b className={styles.reportGreen}>{formatBRL(monthData.receitas)}</b>
          </div>
          <div className={styles.reportStat}>
            <span>Despesas</span>
            <b className={styles.reportRed}>{formatBRL(monthData.despesas)}</b>
          </div>
          <div className={styles.reportStat}>
            <span>Saldo do mês</span>
            <b>{formatBRL(monthData.saldo)}</b>
          </div>
        </div>

        <h3 className={styles.reportSectionTitle}>Despesas por categoria</h3>
        {monthData.categories.list.length === 0 ? (
          <p className={styles.reportEmpty}>Sem despesas neste mês.</p>
        ) : (
          <div className={styles.reportCategories}>
            {monthData.categories.list.map((category) => {
              const pct = monthData.categories.total > 0 ? Math.round((category.value / monthData.categories.total) * 100) : 0
              return (
                <div className={styles.reportCategoryRow} key={category.label}>
                  <div className={styles.reportCategoryInfo}>
                    <span>{category.label}</span>
                    <b>{pct}%</b>
                  </div>
                  <div className={styles.reportBarTrack}>
                    <div
                      className={styles.reportBar}
                      style={{ width: `${pct}%`, background: CATEGORY_COLORS[category.tone] || '#e7e8f2' }}
                    />
                  </div>
                  <span className={styles.reportCategoryValue}>{formatBRL(category.value)}</span>
                </div>
              )
            })}
          </div>
        )}

        <h3 className={styles.reportSectionTitle}>Lançamentos ({monthData.list.length})</h3>
        {monthData.list.length === 0 ? (
          <p className={styles.reportEmpty}>Nenhum lançamento neste mês.</p>
        ) : (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Estabelecimento</th>
                <th>Categoria</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {monthData.list.map((transaction) => (
                <tr key={transaction.id || `${transaction.merchant}-${transaction.date}`}>
                  <td>{formatDateBR(transaction.parsedDate)}</td>
                  <td>{transaction.merchant}</td>
                  <td>{transaction.category || '—'}</td>
                  <td className={isExpense(transaction) ? styles.reportRed : styles.reportGreen}>
                    {isExpense(transaction) ? `− ${formatBRL(Math.abs(parseAmount(transaction)))}` : formatBRL(parseAmount(transaction))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <footer className={styles.reportSheetFoot}>
          <span>FinAI — o radar para as suas finanças</span>
          <span>Saldo do mês: {formatBRL(monthData.saldo)}</span>
        </footer>
      </article>
    </section>
  )
}

MonthlyReport.propTypes = {
  transactions: PropTypes.array.isRequired,
  user: PropTypes.shape({ fullName: PropTypes.string }).isRequired,
}
