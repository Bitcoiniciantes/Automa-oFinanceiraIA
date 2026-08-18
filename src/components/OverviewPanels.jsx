import { useMemo } from 'react'
import PropTypes from 'prop-types'
import styles from '../Dashboard.module.css'
import { buildChartSeries, buildCategories, buildMonthlySummary, CATEGORY_COLORS, formatBRLNoDecimals, monthKey } from '../lib/finance'

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
  const series = useMemo(() => buildChartSeries(transactions), [transactions])
  const hasData = series.some((point) => point.despesas > 0 || point.receitas > 0 || point.saldo !== 0)
  const width = 760
  const height = 240
  const yTop = 18
  const yBottom = 198
  const values = series.flatMap((point) => [point.saldo, point.despesas, point.receitas])
  const max = Math.max(1, ...values)
  const min = Math.min(0, ...values)
  const range = max - min || 1
  const x = (index) => (series.length === 1 ? width / 2 : (index / (series.length - 1)) * width)
  const y = (value) => yBottom - ((value - min) / range) * (yBottom - yTop)
  const yZero = y(0)
  const toPath = (getValue) =>
    series.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(getValue(point)).toFixed(1)}`).join(' ')
  const last = series.length - 1
  return (
    <article className={`${styles.card} ${styles.panel}`}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Fluxo financeiro</h2>
        <select className={styles.select} defaultValue="6">
          <option value="6">Últimos 6 meses</option>
        </select>
      </div>
      <div className={styles.chart}>
        {hasData ? (
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Fluxo financeiro dos últimos 6 meses">
            <g stroke="#eef0f5" strokeWidth="1">
              <path d={`M0 ${yTop}H${width}M0 ${yBottom}H${width}`} />
            </g>
            <path d={`M0 ${yZero}H${width}`} stroke="#d9dbea" strokeWidth="1" strokeDasharray="4 4" />
            <path d={toPath((point) => point.despesas)} fill="none" stroke="#f2a94a" strokeWidth="2.5" />
            <path d={toPath((point) => point.saldo)} fill="none" stroke="#635bff" strokeWidth="3" />
            <circle cx={x(last).toFixed(1)} cy={y(series[last].saldo).toFixed(1)} r="4" fill="#635bff" />
            <g fill="#8c93a8" fontSize="11">
              {series.map((point, index) => (
                <text
                  key={`${point.key}-${index}`}
                  x={index === 0 ? 0 : index === last ? width - 4 : x(index).toFixed(1)}
                  y={height - 10}
                  textAnchor={index === 0 ? 'start' : index === last ? 'end' : 'middle'}
                >
                  {point.label}
                  {point.key === monthKey(new Date()) ? ' · atual' : ''}
                </text>
              ))}
            </g>
          </svg>
        ) : (
          <div className={styles.chartEmpty}>Sem movimentações nos últimos 6 meses.</div>
        )}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendBlue}>Saldo acumulado</span>
        <span className={styles.legendOrange}>Despesas</span>
      </div>
    </article>
  )
}

export function MonthlyComparePanel({ transactions }) {
  const months = useMemo(() => buildMonthlySummary(transactions), [transactions])
  const withData = months.filter((month) => month.lancamentos > 0).reverse()
  const maxGasto = Math.max(1, ...withData.map((month) => month.gastos))
  const current = months[months.length - 1]
  const hasData = withData.length > 0
  return (
    <article className={`${styles.card} ${styles.panel}`}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Comparativo mensal</h2>
        <span className={styles.panelNote}>
          {hasData
            ? `Este mês: ${current.lancamentos} lançamento${current.lancamentos === 1 ? '' : 's'} · ${formatBRLNoDecimals(current.gastos)} em gastos`
            : 'Sem lançamentos nos últimos 6 meses'}
        </span>
      </div>
      {hasData && (
        <div className={styles.monthRows}>
          {withData.map((month) => {
            const isCurrent = month.key === monthKey(new Date())
            const yearLabel = Number(month.key.slice(0, 4)) !== new Date().getFullYear() ? ` ${month.key.slice(0, 4)}` : ''
            return (
              <div key={month.key} className={`${styles.monthRow} ${isCurrent ? styles.monthCurrent : ''}`}>
                <span className={styles.monthLabel}>{isCurrent ? 'Este mês' : `${month.label}${yearLabel}`}</span>
                <span className={styles.monthTrack}>
                  <i style={{ width: `${(month.gastos / maxGasto) * 100}%` }} />
                </span>
                <span className={styles.monthValue}>{formatBRLNoDecimals(month.gastos)}</span>
                <span className={styles.monthCount}>{month.lancamentos}</span>
                <div className={styles.monthDetail}>
                  {month.itens.map((item) => (
                    <div className={styles.monthItem} key={item.groupKey}>
                      <span>
                        {item.merchant}
                        {item.count > 1 && <em className={styles.monthCountBadge}>×{item.count}</em>}
                      </span>
                      <small>{item.date.toLocaleDateString('pt-BR')}</small>
                      <b>{item.value}</b>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

export function CategoryPanel({ transactions }) {
  const { list, total } = useMemo(() => buildCategories(transactions), [transactions])
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
        <select className={styles.select} defaultValue="month">
          <option value="month">Este mês</option>
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

MonthlyComparePanel.propTypes = {
  transactions: PropTypes.array.isRequired,
}

CategoryPanel.propTypes = {
  transactions: PropTypes.array.isRequired,
}

InsightCard.propTypes = {
  insight: PropTypes.node.isRequired,
  onNavigate: PropTypes.func.isRequired,
}
