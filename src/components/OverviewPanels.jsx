import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import styles from '../Dashboard.module.css'
import { buildChartSeries, buildCategories, CATEGORY_COLORS, formatBRLNoDecimals, formatBRLShort, monthKey } from '../lib/finance'

export function StatCard({ label, value, change, icon, tone, down }) {
  return (
    <article className={`${styles.card} ${styles.stat}`}>
      <div className={styles.statTop}>
        {label}
        <span className={`${styles.statIcon} ${styles[tone]}`}>{icon}</span>
      </div>
      <h2>{value}</h2>
      <span className={`${styles.trend} ${down ? styles.trendDown : ''}`}>
        {change} <span className={styles.subtle}>vs. mês passado</span>
      </span>
    </article>
  )
}

export function ChartPanel({ transactions }) {
  const [monthCount, setMonthCount] = useState(12)
  const series = useMemo(() => buildChartSeries(transactions, monthCount), [transactions, monthCount])
  const hasData = series.some((point) => point.despesas > 0 || point.receitas > 0)
  const max = Math.max(1, ...series.flatMap((point) => [point.despesas, point.receitas]))
  const currentKey = monthKey(new Date())
  return (
    <article className={`${styles.card} ${styles.panel}`}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Fluxo financeiro</h2>
        <select className={styles.select} value={monthCount} onChange={(e) => setMonthCount(Number(e.target.value))}>
          <option value="6">Últimos 6 meses</option>
          <option value="12">Últimos 12 meses</option>
        </select>
      </div>
      <div className={styles.chart}>
        {hasData ? (
          <div className={styles.barChart} role="img" aria-label={`Despesas e receitas dos últimos ${monthCount} meses`}>
            {series.map((point) => (
              <div className={styles.barGroup} key={point.key}>
                <div className={styles.bars}>
                  <div className={styles.barWrap}>
                    <div className={`${styles.bar} ${styles.barDespesa}`} style={{ height: `${(point.despesas / max) * 100}%` }} />
                    {point.despesas > 0 && <span className={styles.barValFixed}>{formatBRLShort(point.despesas)}</span>}
                  </div>
                  <div className={styles.barWrap}>
                    <div className={`${styles.bar} ${styles.barReceita}`} style={{ height: `${(point.receitas / max) * 100}%` }} />
                    {point.receitas > 0 && <span className={styles.barValFixed}>{formatBRLShort(point.receitas)}</span>}
                  </div>
                </div>
                <span className={styles.barLabel}>
                  {point.label}
                  {point.key === currentKey ? ' · atual' : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.chartEmpty}>Sem movimentações nos últimos {monthCount} meses.</div>
        )}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendRed}>Despesas</span>
        <span className={styles.legendGreen}>Receitas</span>
      </div>
    </article>
  )
}

export function CategoryPanel({ transactions }) {
  const [period, setPeriod] = useState('month')
  const { list, total } = useMemo(() => buildCategories(transactions, period), [transactions, period])
  let gradient = ''
  if (total > 0) {
    let acc = 0
    gradient =
      'conic-gradient(' +
      list
        .map((category) => {
          const start = (acc / total) * 100
          acc += category.value
          const end = (acc / total) * 100
          return `${CATEGORY_COLORS[category.tone]} ${start}% ${end}%`
        })
        .join(',') +
      ')'
  }
  return (
    <article className={`${styles.card} ${styles.panel}`}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Gastos por categoria</h2>
        <select className={styles.select} value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="month">Este mês</option>
          <option value="prevMonth">Mês anterior</option>
          <option value="6months">6 meses</option>
          <option value="12months">12 meses</option>
        </select>
      </div>
      {list.length === 0 ? (
        <div className={styles.listEmpty}>Sem gastos para exibir.</div>
      ) : (
        <div className={styles.donutWrap}>
          <div className={styles.donut} style={total > 0 ? { background: gradient } : undefined}>
            <div className={styles.donutCenter}>
              <div>
                <b>{formatBRLNoDecimals(total)}</b>total
              </div>
            </div>
          </div>
          <div className={styles.catList}>
            {list.map(({ label, value, tone }) => (
              <div className={styles.cat} key={label}>
                <i className={styles[tone]} />
                {label}
                <b>{((value / total) * 100).toFixed(1).replace('.', ',')}%</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

export function InsightCard({ insight, onNavigate }) {
  return (
    <article className={`${styles.card} ${styles.panel}`}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Insight do FinAI</h2>
        <span className={styles.sparkle}>✦</span>
      </div>
      <p className={styles.insightText}>{insight}</p>
      <button className={styles.insightLink} onClick={() => onNavigate('Assistente IA')}>
        Conversar com o Assistente →
      </button>
    </article>
  )
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  change: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  tone: PropTypes.string.isRequired,
  down: PropTypes.bool,
}

ChartPanel.propTypes = {
  transactions: PropTypes.array.isRequired,
}

CategoryPanel.propTypes = {
  transactions: PropTypes.array.isRequired,
}

InsightCard.propTypes = {
  insight: PropTypes.node.isRequired,
  onNavigate: PropTypes.func.isRequired,
}
