import { useEffect, useMemo, useRef, useState } from 'react'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { getIdToken, signOut } from 'firebase/auth'
import { auth, db } from './firebase'
import styles from './Dashboard.module.css'

const FINAI_AI_ENDPOINT = 'https://bitcoiniciantes-ia.bitcoiniciantes.workers.dev/v1/finai-assistant'
const FINAI_INVOICE_ENDPOINT = FINAI_AI_ENDPOINT.replace('/v1/finai-assistant', '/v1/finai-invoice')
const userCollection = 'usuarios'
const MAX_INVOICE_SIZE = 5 * 1024 * 1024
const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const CATEGORIES = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Outros']
const CATEGORY_TONES = { Moradia: 'brand', Alimentação: 'orange', Transporte: 'teal' }
const CATEGORY_COLORS = { brand: '#635bff', orange: '#f2a94a', teal: '#57b9ad', gray: '#e7e8f2' }

const Icon = ({ children, className = '' }) => <svg className={`${styles.icon} ${className}`} viewBox="0 0 24 24" aria-hidden="true">{children}</svg>
const DashboardIcon = () => <Icon><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Icon>
const BillIcon = () => <Icon><rect x="4" y="5" width="16" height="14"/><path d="M8 9h8M8 13h5"/></Icon>
const WalletIcon = () => <Icon><path d="M4 7h16v12H4zM7 7V5h10v2M8 12h8"/></Icon>
const BellIcon = () => <Icon><path d="M12 3a8 8 0 0 0-8 8v5l-2 2h20l-2-2v-5a8 8 0 0 0-8-8Z"/><path d="M9 21h6"/></Icon>

const mockData = {
  user: { name: 'João', fullName: 'João Silva', initials: 'JS' },
  stats: [
    { label: 'Saldo atual', value: 'R$ 8.420,50', change: '↑ 12,8%', icon: '◈', tone: 'brand' },
    { label: 'Receitas', value: 'R$ 12.500,00', change: '↑ 4,2%', icon: '↗', tone: 'green' },
    { label: 'Despesas', value: 'R$ 4.079,50', change: '↓ 2,1%', icon: '↘', tone: 'red', down: true },
  ],
  transactions: [
    { merchant: 'iFood', date: 'Hoje, 12:42', category: 'Alimentação', initials: 'IF', type: 'food', value: '− R$ 86,40' },
    { merchant: 'Aluguel', date: 'Ontem', category: 'Moradia', initials: '◒', type: 'home', value: '− R$ 2.100,00' },
    { merchant: 'Uber', date: 'Ontem', category: 'Transporte', initials: 'UB', type: 'transport', value: '− R$ 24,90' },
  ],
  subscriptions: [
    { name: 'Netflix', initials: 'N', type: 'netflix', nextCharge: '22 ago.', value: 'R$ 55,90' },
    { name: 'Spotify', initials: '●', type: 'spotify', nextCharge: '25 ago.', value: 'R$ 21,90' },
    { name: 'Gympass', initials: 'G', type: 'gym', nextCharge: '28 ago.', value: 'R$ 89,90' },
  ],
  insight: <>Você gastou <b>18% menos</b> com alimentação este mês. Mantendo esse ritmo, pode economizar até <b>R$ 320</b> até o fim do ano.</>,
}

function pickDefined(obj) {
  if (!obj || typeof obj !== 'object') return {}
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== ''))
}

function mergeDashboardData(remoteData) {
  const remote = remoteData || {}
  return {
    ...mockData,
    ...remote,
    user: { ...mockData.user, ...pickDefined(remote.user) },
    stats: Array.isArray(remote.stats) ? remote.stats : mockData.stats,
    transactions: Array.isArray(remote.transactions) ? remote.transactions : mockData.transactions,
    subscriptions: Array.isArray(remote.subscriptions) ? remote.subscriptions : mockData.subscriptions,
    insight: remote.insight || mockData.insight,
  }
}

async function fetchDashboardData(userId) {
  try {
    const userRef = doc(db, userCollection, userId)
    const userSnapshot = await getDoc(userRef)
    if (!userSnapshot.exists()) return { data: mockData, source: 'fallback' }

    const [transactionsSnapshot, subscriptionsSnapshot] = await Promise.all([
      getDocs(collection(userRef, 'transacoes')),
      getDocs(collection(userRef, 'assinaturas')),
    ])
    const remoteData = {
      user: { name: userSnapshot.data().name },
      transactions: transactionsSnapshot.docs.map(item => ({ id: item.id, ...item.data() })),
      subscriptions: subscriptionsSnapshot.docs.map(item => ({ id: item.id, ...item.data() })),
    }
    return { data: mergeDashboardData(remoteData), source: 'firestore' }
  } catch (error) {
    console.warn('Não foi possível carregar o dashboard do Firestore.', error)
    return { data: mockData, source: 'fallback' }
  }
}

function todayLocalISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseTransactionDate(dateString, fallback = new Date()) {
  if (!dateString) return fallback
  const normalized = String(dateString).trim()
  if (/^hoje/i.test(normalized)) return new Date()
  if (/^ontem/i.test(normalized)) {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d
  }
  const iso = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    if (!Number.isNaN(date.getTime())) return date
  }
  const match = normalized.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/)
  if (match) {
    const day = Number(match[1])
    const month = Number(match[2]) - 1
    const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3])
    const date = new Date(year, month, day)
    if (!Number.isNaN(date.getTime())) return date
  }
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

function parseMoneyInput(str) {
  if (str === undefined || str === null) return NaN
  const cleaned = String(str).replace(/[R$\s]/g, '').trim()
  if (!cleaned) return NaN
  const normalized = cleaned.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const number = Number(normalized)
  return Number.isFinite(number) ? number : NaN
}

function parseAmount(transaction) {
  if (typeof transaction.amount === 'number' && Number.isFinite(transaction.amount)) return transaction.amount
  const raw = String(transaction.value || '')
  const match = raw.match(/[-−]?[\d.,]+/)
  if (!match) return 0
  const normalized = match[0].replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.').replace('−', '-')
  const number = Number(normalized)
  if (!Number.isFinite(number)) return 0
  return /[-−]/.test(raw) ? -Math.abs(number) : Math.abs(number)
}

function isExpense(transaction) {
  const value = String(transaction.value || '').trim()
  return value.includes('−') || value.startsWith('-')
}

function formatBRL(number) {
  const abs = Math.abs(number)
  const [int, dec] = abs.toFixed(2).split('.')
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`
}

function formatBRLNoDecimals(number) {
  return `R$ ${Math.round(Math.abs(number)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function categoryType(category) {
  if (category === 'Moradia') return 'home'
  if (category === 'Transporte') return 'transport'
  return 'food'
}

function subscriptionType(name) {
  const normalized = String(name || '').toLowerCase()
  if (normalized.includes('netflix')) return 'netflix'
  if (normalized.includes('spotify')) return 'spotify'
  if (normalized.includes('gym')) return 'gym'
  return 'other'
}

function toISO(dateString) {
  if (!dateString) return todayLocalISO()
  const value = String(dateString).trim()
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    if (!Number.isNaN(date.getTime())) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  const match = value.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/)
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3]
    return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  }
  return todayLocalISO()
}

function formatChargeDate(iso) {
  if (!iso) return ''
  const [year, month, day] = String(iso).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.getDate()} ${MONTH_LABELS[date.getMonth()]}.`
}

function findDuplicate(transactions, candidate) {
  const merchant = candidate.merchant.trim().toLowerCase()
  const candidateDay = parseTransactionDate(candidate.date).toDateString()
  const candidateAmount = Math.abs(candidate.amount)
  return transactions.find(transaction => {
    if (transaction.id === candidate.id) return false
    if (String(transaction.merchant || '').trim().toLowerCase() !== merchant) return false
    if (Math.abs(Math.abs(parseAmount(transaction)) - candidateAmount) > 0.009) return false
    if (parseTransactionDate(transaction.date).toDateString() !== candidateDay) return false
    return true
  })
}

function buildStats(transactions) {
  if (!transactions.some(transaction => parseAmount(transaction) !== 0)) return mockData.stats
  const now = new Date()
  const thisKey = monthKey(now)
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevKey = monthKey(prevDate)
  let receitas = 0
  let despesas = 0
  let prevReceitas = 0
  let prevDespesas = 0
  transactions.forEach(transaction => {
    const amount = parseAmount(transaction)
    const key = monthKey(parseTransactionDate(transaction.date))
    if (isExpense(transaction)) {
      if (key === thisKey) despesas += Math.abs(amount)
      else if (key === prevKey) prevDespesas += Math.abs(amount)
    } else {
      if (key === thisKey) receitas += amount
      else if (key === prevKey) prevReceitas += amount
    }
  })
  const pctChange = (current, base) => (base > 0 ? ((current - base) / base) * 100 : current > 0 ? 100 : 0)
  const arrow = value => (value >= 0 ? `↑ ${value.toFixed(1)}%` : `↓ ${Math.abs(value).toFixed(1)}%`)
  const hasPrevious = prevReceitas > 0 || prevDespesas > 0
  const saldo = receitas - despesas
  const prevSaldo = prevReceitas - prevDespesas
  return [
    { label: 'Saldo atual', value: formatBRL(saldo), change: hasPrevious ? arrow(pctChange(saldo, prevSaldo)) : '—', icon: '◈', tone: 'brand' },
    { label: 'Receitas', value: formatBRL(receitas), change: hasPrevious ? arrow(pctChange(receitas, prevReceitas)) : '—', icon: '↗', tone: 'green' },
    { label: 'Despesas', value: formatBRL(despesas), change: hasPrevious ? arrow(pctChange(despesas, prevDespesas)) : '—', icon: '↘', tone: 'red', down: pctChange(despesas, prevDespesas) > 0 },
  ]
}

function buildChartSeries(transactions) {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: monthKey(date), label: MONTH_LABELS[date.getMonth()] })
  }
  const buckets = Object.fromEntries(months.map(month => [month.key, { despesas: 0, receitas: 0 }]))
  transactions.forEach(transaction => {
    const bucket = buckets[monthKey(parseTransactionDate(transaction.date))]
    if (!bucket) return
    const amount = Math.abs(parseAmount(transaction))
    if (isExpense(transaction)) bucket.despesas += amount
    else bucket.receitas += amount
  })
  let saldo = 0
  return months.map(month => {
    const bucket = buckets[month.key]
    saldo += bucket.receitas - bucket.despesas
    return { ...bucket, saldo, label: month.label }
  })
}

function buildCategories(transactions) {
  const totals = {}
  transactions.forEach(transaction => {
    if (!isExpense(transaction)) return
    const category = transaction.category || 'Outros'
    totals[category] = (totals[category] || 0) + Math.abs(parseAmount(transaction))
  })
  const list = Object.entries(totals)
    .map(([label, value]) => ({ label, value, tone: CATEGORY_TONES[label] || 'gray' }))
    .sort((a, b) => b.value - a.value)
  const total = list.reduce((sum, category) => sum + category.value, 0)
  return { list, total }
}

function buildInsight(transactions, subscriptions) {
  const expenses = transactions.filter(transaction => isExpense(transaction))
  const totalSpent = expenses.reduce((sum, transaction) => sum + Math.abs(parseAmount(transaction)), 0)
  if (totalSpent <= 0) return mockData.insight
  const byCategory = {}
  expenses.forEach(transaction => {
    const category = transaction.category || 'Outros'
    byCategory[category] = (byCategory[category] || 0) + Math.abs(parseAmount(transaction))
  })
  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
  const subTotal = subscriptions.reduce((sum, subscription) => sum + Math.abs(parseAmount(subscription)), 0)
  const parts = []
  if (top) parts.push(`Sua maior despesa é com ${top[0]} (${formatBRL(top[1])})`)
  if (subTotal > 0) parts.push(`suas assinaturas somam ${formatBRL(subTotal)} por mês`)
  if (parts.length) return <> {parts.join('. ')}.</>
  return <>Acompanhe seus gastos para identificar oportunidades de economia.</>
}

export function Sidebar({ activeItem, onNavigate, subscriptionCount }) {
  const items = [
    ['Visão geral', <DashboardIcon key="overview" />],
    ['Meus gastos', <BillIcon key="expenses" />],
    ['Assinaturas', <WalletIcon key="subscriptions" />],
    ['Assistente IA', <BellIcon key="assistant" />],
  ]
  return <aside className={styles.sidebar}>
    <div className={styles.logo}><span className={styles.logoMark}>✦</span><span className={styles.logoText}>FinAI<small className={styles.logoSub}>Automação Financeira</small></span></div>
    <nav className={styles.nav}>{items.map(([label, icon]) => <button key={label} className={activeItem === label ? styles.active : ''} onClick={() => onNavigate(label)}><span className={styles.navIcon}>{icon}</span>{label}{label === 'Assinaturas' && <span className={styles.navBadge}>{subscriptionCount}</span>}</button>)}</nav>
    <button className={styles.sidebarSignOut} onClick={() => signOut(auth)}>Sair da conta</button><div className={styles.upgrade}><b>Faça seu dinheiro render</b><p>Receba insights personalizados com o FinAI Pro.</p><button>Conhecer o Pro →</button></div>
  </aside>
}

export function Topbar({ user, searchQuery, onSearchChange, searchOpen, onToggleSearch }) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const dateLabel = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, char => char.toUpperCase())
  const [greetingState, setGreetingState] = useState('show')
  useEffect(() => {
    const fade = setTimeout(() => setGreetingState('fading'), 19400)
    const hide = setTimeout(() => setGreetingState('gone'), 20000)
    return () => { clearTimeout(fade); clearTimeout(hide) }
  }, [])
  return <><header className={styles.topbar}><div><p className={styles.eyebrow}>{dateLabel}</p>{greetingState !== 'gone' && <h1 className={`${styles.title} ${greetingState === 'fading' ? styles.titleFade : ''}`}>{greeting}, {user.name} <span>👋</span></h1>}</div><div className={styles.topActions}><button className={`${styles.iconButton} ${styles.mobileMenu}`}>☰</button><button className={`${styles.iconButton} ${searchOpen ? styles.iconButtonActive : ''}`} aria-label="Buscar lançamentos" onClick={onToggleSearch}>⌕</button><div className={styles.avatar}><span>{user.fullName}</span><span className={styles.avatarFace}>{user.initials}</span></div><button className={styles.signOut} onClick={() => signOut(auth)}>Sair</button></div></header>{searchOpen && <div className={styles.searchBar}><span className={styles.searchIcon}>⌕</span><input value={searchQuery} onChange={event => onSearchChange(event.target.value)} placeholder="Buscar lançamentos por nome, categoria ou valor…" aria-label="Buscar lançamentos"/></div>}</>
}

export function StatCard({ label, value, change, icon, tone, down }) {
  return <article className={`${styles.card} ${styles.stat}`}><div className={styles.statTop}>{label}<span className={`${styles.statIcon} ${styles[tone]}`}>{icon}</span></div><h2>{value}</h2><span className={`${styles.trend} ${down ? styles.trendDown : ''}`}>{change} <span className={styles.subtle}>vs. mês passado</span></span></article>
}

export function ChartPanel({ transactions }) {
  const series = useMemo(() => buildChartSeries(transactions), [transactions])
  const hasData = series.some(point => point.despesas > 0 || point.receitas > 0 || point.saldo !== 0)
  const width = 760
  const height = 240
  const yTop = 18
  const yBottom = 198
  const values = series.flatMap(point => [point.saldo, point.despesas, point.receitas])
  const max = Math.max(1, ...values)
  const min = Math.min(0, ...values)
  const range = (max - min) || 1
  const x = index => series.length === 1 ? width / 2 : (index / (series.length - 1)) * width
  const y = value => yBottom - ((value - min) / range) * (yBottom - yTop)
  const yZero = y(0)
  const toPath = getValue => series.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(getValue(point)).toFixed(1)}`).join(' ')
  const last = series.length - 1
  return <article className={`${styles.card} ${styles.panel}`}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Fluxo financeiro</h2><select className={styles.select} defaultValue="6"><option value="6">Últimos 6 meses</option></select></div><div className={styles.chart}>{hasData ? <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Fluxo financeiro dos últimos 6 meses"><g stroke="#eef0f5" strokeWidth="1"><path d={`M0 ${yTop}H${width}M0 ${yBottom}H${width}`}/></g><path d={`M0 ${yZero}H${width}`} stroke="#d9dbea" strokeWidth="1" strokeDasharray="4 4"/><path d={toPath(point => point.despesas)} fill="none" stroke="#f2a94a" strokeWidth="2.5"/><path d={toPath(point => point.saldo)} fill="none" stroke="#635bff" strokeWidth="3"/><circle cx={x(last).toFixed(1)} cy={y(series[last].saldo).toFixed(1)} r="4" fill="#635bff"/><g fill="#8c93a8" fontSize="11">{series.map((point, index) => <text key={`${point.key}-${index}`} x={index === 0 ? 0 : index === last ? width - 4 : x(index).toFixed(1)} y={height - 10} textAnchor={index === 0 ? 'start' : index === last ? 'end' : 'middle'}>{point.label}{point.key === monthKey(new Date()) ? ' · atual' : ''}</text>)}</g></svg> : <div className={styles.chartEmpty}>Sem movimentações nos últimos 6 meses.</div>}</div><div className={styles.legend}><span className={styles.legendBlue}>Saldo acumulado</span><span className={styles.legendOrange}>Despesas</span></div></article>
}

function buildMonthlySummary(transactions) {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: monthKey(date), label: MONTH_LABELS[date.getMonth()], gastos: 0, lancamentos: 0, itens: [] })
  }
  const buckets = Object.fromEntries(months.map(month => [month.key, month]))
  transactions.forEach(transaction => {
    const date = parseTransactionDate(transaction.date)
    const bucket = buckets[monthKey(date)]
    if (!bucket) return
    const amount = Math.abs(parseAmount(transaction))
    const expense = isExpense(transaction)
    if (expense) bucket.gastos += amount
    const groupKey = `${String(transaction.merchant || '').trim().toLowerCase()}|${date.toDateString()}`
    const existing = bucket.itens.find(item => item.groupKey === groupKey)
    if (existing) {
      existing.total += amount
      existing.count += 1
      existing.value = `${expense ? '− ' : ''}R$ ${existing.total.toFixed(2).replace('.', ',')}`
    } else {
      bucket.lancamentos += 1
      bucket.itens.push({ groupKey, merchant: transaction.merchant, date, total: amount, count: 1, value: `${expense ? '− ' : ''}R$ ${amount.toFixed(2).replace('.', ',')}` })
    }
  })
  return months
}

export function MonthlyComparePanel({ transactions }) {
  const months = useMemo(() => buildMonthlySummary(transactions), [transactions])
  const withData = months.filter(month => month.lancamentos > 0).reverse()
  const maxGasto = Math.max(1, ...withData.map(month => month.gastos))
  const current = months[months.length - 1]
  const hasData = withData.length > 0
  return <article className={`${styles.card} ${styles.panel}`}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Comparativo mensal</h2><span className={styles.panelNote}>{hasData ? `Este mês: ${current.lancamentos} lançamento${current.lancamentos === 1 ? '' : 's'} · ${formatBRLNoDecimals(current.gastos)} em gastos` : 'Sem lançamentos nos últimos 6 meses'}</span></div>{hasData && <div className={styles.monthRows}>{withData.map(month => { const isCurrent = month.key === monthKey(new Date()); return <div key={month.key} className={`${styles.monthRow} ${isCurrent ? styles.monthCurrent : ''}`}><span className={styles.monthLabel}>{isCurrent ? 'Este mês' : month.label}</span><span className={styles.monthTrack}><i style={{ width: `${(month.gastos / maxGasto) * 100}%` }} /></span><span className={styles.monthValue}>{formatBRLNoDecimals(month.gastos)}</span><span className={styles.monthCount}>{month.lancamentos}</span><div className={styles.monthDetail}>{month.itens.map(item => <div className={styles.monthItem} key={item.groupKey}><span>{item.merchant}{item.count > 1 && <em className={styles.monthCountBadge}>×{item.count}</em>}</span><small>{item.date.toLocaleDateString('pt-BR')}</small><b>{item.value}</b></div>)}</div></div> })}</div>}</article>
}

export function TransactionItem({ transaction, onEdit, onDelete }) {
  const typeClass = styles[transaction.type] || styles.food
  return <div className={styles.expense}><span className={`${styles.merchantIcon} ${typeClass}`}>{transaction.initials}</span><div className={styles.expenseInfo}><b>{transaction.merchant}</b><small>{transaction.date} · {transaction.category}</small></div><span className={styles.expenseValue}>{transaction.value}</span>{transaction.id && <div className={styles.rowActions}><button className={styles.rowAction} onClick={onEdit} aria-label={`Editar ${transaction.merchant}`}>Editar</button><button className={`${styles.rowAction} ${styles.danger}`} onClick={onDelete} aria-label={`Excluir ${transaction.merchant}`}>Excluir</button></div>}</div>
}

function ExpenseForm({ userId, transactions, onSaved }) {
  const emptyForm = () => ({ merchant: '', value: '', category: 'Alimentação', date: todayLocalISO() })
  const formRef = useRef(null)
  const [form, setForm] = useState(emptyForm)
  const [invoice, setInvoice] = useState(null)
  const [pendingInvoice, setPendingInvoice] = useState(null)
  const [analysisNotice, setAnalysisNotice] = useState('')
  const [analysisStatus, setAnalysisStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [duplicate, setDuplicate] = useState(null)
  const [bypassDuplicate, setBypassDuplicate] = useState(false)

  function updateField(key, value) {
    setForm(current => ({ ...current, [key]: value }))
    setDuplicate(null)
    setError('')
  }

  function selectInvoice(file) {
    setInvoice(file)
    setPendingInvoice(null)
    setAnalysisNotice('')
    setAnalysisStatus('')
    setError('')
    setDuplicate(null)
    if (!file) return
    if (file.size > MAX_INVOICE_SIZE) { setError('A nota fiscal deve ter no máximo 5 MB.'); return }
    setSaving(true)
    readInvoice(file)
      .catch(readError => {
        console.error('Não foi possível ler a nota fiscal.', readError)
        setError(readError.message || 'Não foi possível ler a nota fiscal.')
      })
      .finally(() => setSaving(false))
  }

  async function readInvoice(file) {
    const token = await getIdToken(auth.currentUser)
    const transactionRef = doc(collection(db, userCollection, userId, 'transacoes'))
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileName', file.name)
    formData.append('archive', 'false')
    const uploadResponse = await fetch(FINAI_INVOICE_ENDPOINT, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
    const uploadResult = await uploadResponse.json()
    if (!uploadResponse.ok) throw new Error(uploadResult.error || 'Falha na leitura da nota fiscal')
    setPendingInvoice({ id: transactionRef.id, path: uploadResult.path || null, name: uploadResult.name, provider: uploadResult.provider })
    const extraction = uploadResult.extraction
    if (extraction) {
      setForm(current => ({ ...current, merchant: extraction.merchant || current.merchant, value: extraction.amount ? extraction.amount.toFixed(2).replace('.', ',') : current.value, category: extraction.category || current.category, date: extraction.date ? toISO(extraction.date) : current.date }))
      const complete = Boolean(extraction.merchant && extraction.amount && extraction.date)
      setAnalysisStatus(complete ? 'success' : 'warning')
      setAnalysisNotice(complete ? 'Leitura com sucesso. Revise os dados acima e clique em Salvar gasto.' : 'Não foi possível ler todos os campos. Complete ou corrija os dados acima e clique em Salvar gasto.')
    } else {
      setAnalysisStatus('warning')
      setAnalysisNotice('Não foi possível ler todos os campos. Complete ou corrija os dados acima e clique em Salvar gasto.')
    }
  }

  async function archiveInvoice(file, transactionId) {
    const token = await getIdToken(auth.currentUser)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileName', file.name)
    formData.append('transactionId', transactionId)
    formData.append('archive', 'true')
    const archiveResponse = await fetch(FINAI_INVOICE_ENDPOINT, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
    const archiveResult = await archiveResponse.json()
    if (!archiveResponse.ok) throw new Error(archiveResult.error || 'Não foi possível arquivar a nota fiscal')
    return { path: archiveResult.path, name: archiveResult.name, provider: archiveResult.provider }
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (invoice && invoice.size > MAX_INVOICE_SIZE) { setError('A nota fiscal deve ter no máximo 5 MB.'); return }
    setSaving(true)
    try {
      if (invoice && !pendingInvoice) {
        await readInvoice(invoice)
        return
      }
      const amount = parseMoneyInput(form.value)
      if (!form.merchant.trim() || !Number.isFinite(amount) || amount <= 0) { setError('Informe o estabelecimento e um valor válido.'); return }
      if (!bypassDuplicate) {
        const match = findDuplicate(transactions, { merchant: form.merchant.trim(), amount, date: form.date })
        if (match) {
          setDuplicate(match)
          return
        }
      }
      let activeInvoice = pendingInvoice
      if (invoice && pendingInvoice && !pendingInvoice.path) {
        const archived = await archiveInvoice(invoice, pendingInvoice.id)
        activeInvoice = { ...pendingInvoice, ...archived }
        setPendingInvoice(activeInvoice)
      }
      const transactionRef = activeInvoice ? doc(db, userCollection, userId, 'transacoes', activeInvoice.id) : doc(collection(db, userCollection, userId, 'transacoes'))
      const transaction = { merchant: form.merchant.trim(), category: form.category, date: new Date(`${form.date}T12:00:00`).toLocaleDateString('pt-BR'), initials: form.merchant.trim().slice(0, 2).toUpperCase(), type: categoryType(form.category), value: `− R$ ${amount.toFixed(2).replace('.', ',')}`, amount, ...(activeInvoice && activeInvoice.path ? { invoicePath: activeInvoice.path, invoiceName: activeInvoice.name, invoiceProvider: activeInvoice.provider || 'gemini' } : {}) }
      await setDoc(transactionRef, transaction)
      onSaved({ id: transactionRef.id, ...transaction })
      resetForm()
    } catch (saveError) {
      console.error('Não foi possível salvar o gasto.', saveError)
      setError(saveError.message || 'Não foi possível salvar. Verifique as regras do Firestore.')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setForm(emptyForm())
    setInvoice(null)
    setPendingInvoice(null)
    setAnalysisNotice('')
    setAnalysisStatus('')
    setDuplicate(null)
    setBypassDuplicate(false)
    formRef.current?.reset()
  }

  function confirmDuplicate() {
    setBypassDuplicate(true)
    setDuplicate(null)
    formRef.current?.requestSubmit()
  }

  const buttonLabel = saving ? (invoice && !pendingInvoice ? 'Lendo nota…' : 'Salvando…') : invoice && !pendingInvoice ? 'Ler nota fiscal' : pendingInvoice ? 'Salvar gasto' : 'Adicionar gasto'
  return <form className={styles.expenseForm} onSubmit={submit} ref={formRef}><div className={styles.formGrid}><label>Estabelecimento<input value={form.merchant} onChange={event => updateField('merchant', event.target.value)} placeholder="Ex.: Mercado" /></label><label>Valor<input value={form.value} onChange={event => updateField('value', event.target.value)} inputMode="decimal" placeholder="0,00" /></label><label>Data<input type="date" value={form.date} onChange={event => updateField('date', event.target.value)} required /></label><label>Categoria<select value={form.category} onChange={event => updateField('category', event.target.value)}>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label></div><div className={styles.formActions}><label className={styles.invoiceInput}>Nota fiscal (opcional)<input type="file" accept="image/jpeg,image/png,application/pdf" onChange={event => { void selectInvoice(event.target.files?.[0] || null) }} /></label><button type="submit" disabled={saving}>{buttonLabel}</button></div>{invoice && <small className={styles.fileHint}>Arquivo: {invoice.name}</small>}{duplicate && <div className={styles.analysisWarning} role="alert">Possível lançamento duplicado: <b>{duplicate.merchant}</b> · {duplicate.value} · {duplicate.date}.<br /><span className={styles.dupActions}><button type="button" onClick={confirmDuplicate}>Adicionar mesmo assim</button><button type="button" onClick={resetForm}>Cancelar</button></span></div>}{analysisNotice && <div className={analysisStatus === 'success' ? styles.analysisSuccess : styles.analysisWarning} role="status" aria-live="polite">{analysisNotice}</div>}{error && <div className={styles.authError} role="alert">{error}</div>}</form>
}

export function TransactionList({ userId, transactions, onChanged }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function startEdit(transaction) {
    setEditingId(transaction.id)
    setError('')
    setDraft({ merchant: transaction.merchant || '', category: transaction.category || 'Outros', date: toISO(transaction.date), value: Math.abs(parseAmount(transaction)).toFixed(2).replace('.', ',') })
  }

  async function saveEdit(event) {
    event.preventDefault()
    if (!draft) return
    const amount = parseMoneyInput(draft.value)
    if (!draft.merchant.trim() || !Number.isFinite(amount) || amount <= 0) { setError('Informe um estabelecimento e um valor válido.'); return }
    setBusy(true)
    try {
      const next = { merchant: draft.merchant.trim(), category: draft.category, date: new Date(`${draft.date}T12:00:00`).toLocaleDateString('pt-BR'), initials: draft.merchant.trim().slice(0, 2).toUpperCase(), type: categoryType(draft.category), value: `− R$ ${amount.toFixed(2).replace('.', ',')}`, amount }
      await updateDoc(doc(db, userCollection, userId, 'transacoes', editingId), next)
      onChanged({ updated: { id: editingId, ...next } })
      setEditingId(null)
      setDraft(null)
    } catch (saveError) {
      console.error('Não foi possível atualizar o gasto.', saveError)
      setError(saveError.message || 'Não foi possível atualizar o gasto.')
    } finally { setBusy(false) }
  }

  async function removeTransaction(id) {
    if (!window.confirm('Excluir esta transação?')) return
    setBusy(true)
    try {
      await deleteDoc(doc(db, userCollection, userId, 'transacoes', id))
      onChanged({ removed: id })
    } catch (saveError) {
      console.error('Não foi possível excluir o gasto.', saveError)
      setError(saveError.message || 'Não foi possível excluir o gasto.')
    } finally { setBusy(false) }
  }

  return <article className={`${styles.card} ${styles.panel}`}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Transações recentes</h2></div>{error && <div className={styles.authError} role="alert">{error}</div>}{transactions.length === 0 ? <div className={styles.listEmpty}>Nenhuma transação cadastrada ainda.</div> : transactions.map(transaction => editingId === transaction.id ? <form key={transaction.id} className={styles.editRow} onSubmit={saveEdit}><div className={styles.editFields}><input value={draft?.merchant || ''} onChange={event => setDraft(current => ({ ...current, merchant: event.target.value }))} aria-label="Estabelecimento" /><input value={draft?.value || ''} onChange={event => setDraft(current => ({ ...current, value: event.target.value }))} inputMode="decimal" aria-label="Valor" /><input type="date" value={draft?.date || ''} onChange={event => setDraft(current => ({ ...current, date: event.target.value }))} aria-label="Data" /><select value={draft?.category || 'Outros'} onChange={event => setDraft(current => ({ ...current, category: event.target.value }))} aria-label="Categoria">{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></div><div className={styles.rowActions}><button className={styles.rowAction} type="submit" disabled={busy}>Salvar</button><button className={styles.rowAction} type="button" onClick={() => { setEditingId(null); setDraft(null) }}>Cancelar</button></div></form> : <TransactionItem key={transaction.id || `${transaction.merchant}-${transaction.date}`} transaction={transaction} onEdit={() => startEdit(transaction)} onDelete={() => removeTransaction(transaction.id)} />)}</article>
}

export function CategoryPanel({ transactions }) {
  const { list, total } = useMemo(() => buildCategories(transactions), [transactions])
  let gradient = ''
  if (total > 0) {
    let acc = 0
    gradient = 'conic-gradient(' + list.map(category => {
      const start = (acc / total) * 100
      acc += category.value
      const end = (acc / total) * 100
      return `${CATEGORY_COLORS[category.tone]} ${start}% ${end}%`
    }).join(',') + ')'
  }
  return <article className={`${styles.card} ${styles.panel}`}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Gastos por categoria</h2><select className={styles.select} defaultValue="month"><option value="month">Este mês</option></select></div>{list.length === 0 ? <div className={styles.listEmpty}>Sem gastos para exibir.</div> : <div className={styles.donutWrap}><div className={styles.donut} style={total > 0 ? { background: gradient } : undefined}><div className={styles.donutCenter}><div><b>{formatBRLNoDecimals(total)}</b>total</div></div></div><div className={styles.catList}>{list.map(({ label, value, tone }) => <div className={styles.cat} key={label}><i className={styles[tone]}/>{label}<b>{((value / total) * 100).toFixed(1).replace('.', ',')}%</b></div>)}</div></div>}</article>
}

export function SubscriptionRadar({ userId, subscriptions, onChanged }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)

  function startEdit(subscription) {
    setEditingId(subscription.id)
    setError('')
    setDraft({ name: subscription.name || '', value: Math.abs(parseAmount(subscription)).toFixed(2).replace('.', ','), nextCharge: subscription.chargeDate || todayLocalISO() })
  }

  async function saveEdit(event) {
    event.preventDefault()
    if (!draft) return
    const amount = parseMoneyInput(draft.value)
    if (!draft.name.trim() || !Number.isFinite(amount) || amount <= 0) { setError('Informe um nome e um valor válido.'); return }
    setBusy(true)
    try {
      const next = { name: draft.name.trim(), initials: draft.name.trim().slice(0, 2).toUpperCase(), type: subscriptionType(draft.name), chargeDate: draft.nextCharge, nextCharge: formatChargeDate(draft.nextCharge), value: `R$ ${amount.toFixed(2).replace('.', ',')}`, amount }
      await updateDoc(doc(db, userCollection, userId, 'assinaturas', editingId), next)
      onChanged({ updated: { id: editingId, ...next } })
      setEditingId(null)
      setDraft(null)
    } catch (saveError) {
      console.error('Não foi possível atualizar a assinatura.', saveError)
      setError(saveError.message || 'Não foi possível atualizar a assinatura.')
    } finally { setBusy(false) }
  }

  async function removeSubscription(id) {
    if (!window.confirm('Excluir esta assinatura?')) return
    setBusy(true)
    try {
      await deleteDoc(doc(db, userCollection, userId, 'assinaturas', id))
      onChanged({ removed: id })
    } catch (saveError) {
      console.error('Não foi possível excluir a assinatura.', saveError)
      setError(saveError.message || 'Não foi possível excluir a assinatura.')
    } finally { setBusy(false) }
  }

  function saveSubscription(subscription) {
    onChanged({ added: subscription })
    setShowForm(false)
  }

  const increased = subscriptions.find(subscription => Number(subscription.priceChange) > 0)
  const subTotal = subscriptions.reduce((sum, subscription) => sum + Math.abs(parseAmount(subscription)), 0)

  return <article className={`${styles.card} ${styles.panel}`}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Radar de assinaturas</h2><button className={styles.select} onClick={() => setShowForm(current => !current)}>{showForm ? 'Fechar' : 'Nova assinatura'}</button></div>{error && <div className={styles.authError} role="alert">{error}</div>}{showForm && <SubscriptionForm userId={userId} onSaved={saveSubscription} />}{subscriptions.length === 0 ? <div className={styles.listEmpty}>Nenhuma assinatura cadastrada.</div> : subscriptions.map(subscription => editingId === subscription.id ? <form key={subscription.id} className={styles.subRow} onSubmit={saveEdit}><div className={styles.subEditFields}><input value={draft?.name || ''} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} aria-label="Nome da assinatura" /><input value={draft?.value || ''} onChange={event => setDraft(current => ({ ...current, value: event.target.value }))} inputMode="decimal" aria-label="Valor" /><input type="date" value={draft?.nextCharge || ''} onChange={event => setDraft(current => ({ ...current, nextCharge: event.target.value }))} aria-label="Próxima cobrança" /></div><div className={styles.rowActions}><button className={styles.rowAction} type="submit" disabled={busy}>Salvar</button><button className={styles.rowAction} type="button" onClick={() => { setEditingId(null); setDraft(null) }}>Cancelar</button></div></form> : <div className={styles.subscription} key={subscription.id}><span className={`${styles.subLogo} ${styles[subscription.type] || styles.other}`}>{subscription.initials}</span><div className={styles.grow}><b>{subscription.name}</b><small>Próxima cobrança: {subscription.nextCharge}</small></div><strong>{subscription.value}</strong>{subscription.id && <div className={styles.rowActions}><button className={styles.rowAction} onClick={() => startEdit(subscription)} aria-label={`Editar ${subscription.name}`}>Editar</button><button className={`${styles.rowAction} ${styles.danger}`} onClick={() => removeSubscription(subscription.id)} aria-label={`Excluir ${subscription.name}`}>Excluir</button></div>}</div>)}{increased ? <div className={styles.alert}><span>⚠</span><span><b>Atenção:</b> o preço de {increased.name} aumentou {formatBRL(increased.priceChange)} este mês.</span></div> : subTotal > 0 ? <div className={styles.alert}><span>✦</span><span>Você gasta <b>{formatBRL(subTotal)}</b> por mês com assinaturas.</span></div> : null}</article>
}

function SubscriptionForm({ userId, onSaved }) {
  const emptyForm = () => ({ name: '', value: '', nextCharge: todayLocalISO() })
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    const amount = parseMoneyInput(form.value)
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) { setError('Informe o nome e um valor válido.'); return }
    setSaving(true)
    try {
      const ref = doc(collection(db, userCollection, userId, 'assinaturas'))
      const subscription = { name: form.name.trim(), initials: form.name.trim().slice(0, 2).toUpperCase(), type: subscriptionType(form.name), chargeDate: form.nextCharge, nextCharge: formatChargeDate(form.nextCharge), value: `R$ ${amount.toFixed(2).replace('.', ',')}`, amount }
      await setDoc(ref, subscription)
      onSaved({ id: ref.id, ...subscription })
      setForm(emptyForm())
    } catch (saveError) {
      console.error('Não foi possível salvar a assinatura.', saveError)
      setError(saveError.message || 'Não foi possível salvar a assinatura.')
    } finally { setSaving(false) }
  }

  return <form className={styles.expenseForm} onSubmit={submit}><div className={styles.subGrid}><label>Nome<input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Ex.: Netflix" /></label><label>Valor<input value={form.value} onChange={event => setForm(current => ({ ...current, value: event.target.value }))} inputMode="decimal" placeholder="0,00" /></label><label>Próxima cobrança<input type="date" value={form.nextCharge} onChange={event => setForm(current => ({ ...current, nextCharge: event.target.value }))} required /></label><button className={styles.submitBtn} type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Adicionar'}</button></div>{error && <div className={styles.authError} role="alert">{error}</div>}</form>
}

function renderMarkdown(text) {
  const escaped = String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const lines = escaped.split(/\r?\n/)
  let html = ''
  let inList = false
  const closeList = () => { if (inList) { html += '</ul>'; inList = false } }
  lines.forEach(line => {
    const trimmed = line.trim()
    if (/^#{1,3}\s+/.test(trimmed)) {
      closeList()
      html += `<b>${trimmed.replace(/^#{1,3}\s+/, '')}</b><br/>`
    } else if (/^[*•-]\s+/.test(trimmed)) {
      if (!inList) { html += '<ul>'; inList = true }
      html += `<li>${trimmed.replace(/^[*•-]\s+/, '')}</li>`
    } else if (/^\d+[.)]\s+/.test(trimmed)) {
      if (!inList) { html += '<ul>'; inList = true }
      html += `<li>${trimmed.replace(/^\d+[.)]\s+/, '')}</li>`
    } else {
      closeList()
      if (trimmed) html += `${trimmed}<br/>`
    }
  })
  closeList()
  const bold = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  return bold.replace(/`([^`]+)`/g, '<code>$1</code>')
}

export function InsightCard({ insight, onNavigate }) {
  return <article className={`${styles.card} ${styles.panel}`}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Insight do FinAI</h2><span className={styles.sparkle}>✦</span></div><p className={styles.insightText}>{insight}</p><button className={styles.insightLink} onClick={() => onNavigate('Assistente IA')}>Conversar com o Assistente →</button></article>
}

function AssistantPanel({ data, stats, userId }) {
  const [messages, setMessages] = useState([{ role: 'model', text: 'Olá! Posso analisar seus gastos, receitas e assinaturas.' }])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  useEffect(() => {
    getDoc(doc(db, userCollection, userId, 'assistente', 'conversa')).then(snapshot => {
      const saved = snapshot.data()?.messages
      if (Array.isArray(saved)) setMessages(saved.slice(-30))
    }).catch(error => console.warn('Histórico do assistente indisponível.', error)).finally(() => setHistoryLoaded(true))
  }, [userId])

  useEffect(() => {
    if (!historyLoaded) return
    setDoc(doc(db, userCollection, userId, 'assistente', 'conversa'), { messages: messages.slice(-30), updatedAt: new Date().toISOString() }, { merge: true }).catch(error => console.warn('Não foi possível salvar o histórico do assistente.', error))
  }, [messages, historyLoaded, userId])

  async function sendMessage(event) {
    event.preventDefault()
    const question = prompt.trim()
    if (!question || loading) return
    setPrompt('')
    setMessages(current => [...current, { role: 'user', text: question }])
    setLoading(true)
    try {
      const token = await getIdToken(auth.currentUser)
      const response = await fetch(FINAI_AI_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ question, context: { transacoes: data.transactions, assinaturas: data.subscriptions, resumo: stats } }) })
      const result = await response.json()
      if (!response.ok || typeof result.answer !== 'string') throw new Error(result.error || 'Resposta indisponível')
      setMessages(current => [...current, { role: 'model', provider: result.provider, text: result.answer }])
    } catch (error) {
      console.error('Falha ao consultar o Assistente IA.', error)
      const detail = error && error.message ? error.message : String(error || 'erro desconhecido')
      setMessages(current => [...current, { role: 'error', text: `Não foi possível consultar o assistente agora. (${detail})` }])
    } finally { setLoading(false) }
  }

  async function clearConversation() {
    if (!window.confirm('Apagar todo o histórico da conversa?')) return
    setMessages([])
    try {
      await deleteDoc(doc(db, userCollection, userId, 'assistente', 'conversa'))
    } catch (error) {
      console.warn('Não foi possível limpar o histórico do assistente.', error)
    }
  }

  return <article className={`${styles.card} ${styles.panel} ${styles.assistantPanel}`}>
    <div className={styles.panelHead}><h2 className={styles.panelTitle}>Conversa com o FinAI</h2><span className={styles.panelActions}><span className={styles.sparkle}>✦</span><button className={styles.chatClear} onClick={clearConversation} disabled={loading}>Limpar conversa</button></span></div>
    <form className={styles.chatForm} onSubmit={sendMessage}><input value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Ex.: onde posso economizar?" aria-label="Mensagem para o assistente"/><button type="submit" disabled={loading || !prompt.trim()}>Enviar</button></form>
    <div className={styles.chatMessages}>{loading && <div className={`${styles.chatMessage} ${styles.model}`}>Analisando seus dados…</div>}{messages.slice().reverse().map((message, index) => <div key={`${message.role}-${index}`} className={`${styles.chatMessage} ${styles[message.role]}`}>{message.provider && <small className={styles.chatProvider}>Respondido por: {message.provider === 'groq' ? 'Groq' : 'Gemini'}</small>}<span dangerouslySetInnerHTML={{ __html: renderMarkdown(message.text) }} /></div>)}</div>
  </article>
}

export default function Dashboard({ userId }) {
  const [data, setData] = useState(mockData)
  const [dataSource, setDataSource] = useState('carregando')
  const [activeItem, setActiveItem] = useState('Visão geral')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchDashboardData(userId).then(result => {
      if (cancelled) return
      setDataSource(result.source)
      setData(result.data)
    })
    return () => { cancelled = true }
  }, [userId])

  function applyChange(kind, change) {
    setData(current => {
      let nextList = current[kind]
      if (change.removed) nextList = current[kind].filter(item => item.id !== change.removed)
      else if (change.updated) nextList = [change.updated, ...current[kind].filter(item => item.id !== change.updated.id)]
      else if (change.added) nextList = [change.added, ...current[kind]]
      return { ...current, [kind]: nextList }
    })
  }

  const stats = useMemo(() => buildStats(data.transactions), [data.transactions])
  const insight = useMemo(() => buildInsight(data.transactions, data.subscriptions), [data.transactions, data.subscriptions])
  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('pt-BR')
    if (!query) return data.transactions
    return data.transactions.filter(transaction => [transaction.merchant, transaction.category, transaction.value, transaction.date].some(field => String(field || '').toLocaleLowerCase('pt-BR').includes(query)))
  }, [data.transactions, searchQuery])

  const pageContent = activeItem === 'Visão geral' ? <><section><div className={styles.dataStatus} aria-live="polite">{dataSource === 'firestore' ? 'Dados sincronizados' : dataSource === 'fallback' ? 'Exibindo dados de demonstração' : 'Carregando dados…'}</div><div className={styles.stats}>{stats.map(stat => <StatCard key={stat.label} {...stat}/>)}</div><ChartPanel transactions={data.transactions}/><MonthlyComparePanel transactions={data.transactions}/><div className={styles.lower}><TransactionList userId={userId} transactions={filteredTransactions} onChanged={change => applyChange('transactions', change)}/><CategoryPanel transactions={data.transactions}/></div></section><aside className={styles.side}><SubscriptionRadar userId={userId} subscriptions={data.subscriptions} onChanged={change => applyChange('subscriptions', change)}/><InsightCard insight={insight} onNavigate={setActiveItem}/></aside></> : activeItem === 'Meus gastos' ? <section><div className={styles.pageIntro}><h2>Meus gastos</h2><p>Cadastre, edite ou exclua suas transações.</p></div><ExpenseForm userId={userId} transactions={data.transactions} onSaved={transaction => applyChange('transactions', { added: transaction })}/><TransactionList userId={userId} transactions={filteredTransactions} onChanged={change => applyChange('transactions', change)}/></section> : activeItem === 'Assinaturas' ? <section><div className={styles.pageIntro}><h2>Assinaturas</h2><p>Acompanhe, adicione ou edite suas assinaturas.</p></div><SubscriptionRadar userId={userId} subscriptions={data.subscriptions} onChanged={change => applyChange('subscriptions', change)}/></section> : <section><div className={styles.pageIntro}><h2>Assistente IA</h2><p>Faça perguntas sobre seus dados financeiros.</p></div><AssistantPanel data={data} stats={stats} userId={userId}/></section>

  return <div className={styles.app}><Sidebar activeItem={activeItem} onNavigate={setActiveItem} subscriptionCount={data.subscriptions.length}/><main><Topbar user={data.user} searchQuery={searchQuery} onSearchChange={setSearchQuery} searchOpen={searchOpen} onToggleSearch={() => setSearchOpen(open => !open)}/><div className={styles.content}>{pageContent}</div></main></div>
}
