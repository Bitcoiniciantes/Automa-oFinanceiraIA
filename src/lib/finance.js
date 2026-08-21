export const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const CATEGORIES = ['Alimentação', 'Gastronomia', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Outros']
export const RECEITA_CATEGORIES = ['Salário', 'Aluguel', 'Pró-Labore', 'Renda passiva', 'Juros aplicações', 'Créditos diversos', 'Outros']

export const CATEGORY_KEYWORDS = [
  [
    'Alimentação',
    [
      'mercado',
      'supermercado',
      'padaria',
      'pao',
      'acougue',
      'hortifruti',
      'ifood',
      'restaurante',
      'lanchonete',
      'pizza',
      'sushi',
      'hamburguer',
      'burger',
      'delivery',
      'acai',
      'sorvete',
      'cafe',
      'suco',
      'feira',
      'quitanda',
    ],
  ],
  [
    'Gastronomia',
    [
      'gastronomia',
      'bar',
      'bares',
      'pizzaria',
      'pizza',
      'vinho',
      'vinhos',
      'doce',
      'doces',
      'confeitaria',
      'padaria',
      'cerveja',
      'drink',
      'drinks',
      'cocktail',
      'churrascaria',
      'restaurante',
      'lanchonete',
      'hamburguer',
      'burger',
      'sushi',
      'japanese',
      'chinese',
      'italiano',
      'arabe',
    ],
  ],
  [
    'Moradia',
    [
      'aluguel',
      'condominio',
      'imobiliaria',
      'iptu',
      'energia',
      'eletrica',
      'agua',
      'internet',
      'net',
      'vivo',
      'claro',
      'oi',
      'lar',
      'casa',
      'mobilia',
    ],
  ],
  [
    'Transporte',
    [
      'uber',
      'taxi',
      '99',
      'posto',
      'gasolina',
      'combustivel',
      'estacionamento',
      'pedagio',
      'passagem',
      'onibus',
      'metro',
      'trem',
      'aeroporto',
      'azul',
      'latam',
      'gol',
    ],
  ],
  [
    'Saúde',
    [
      'farmacia',
      'drogaria',
      'medico',
      'consulta',
      'dentista',
      'clinica',
      'hospital',
      'laboratorio',
      'academia',
      'psicologo',
      'plano de saude',
      'unimed',
      'amil',
      'sulamerica',
    ],
  ],
  ['Educação', ['escola', 'faculdade', 'curso', 'universidade', 'idiomas', 'ingles', 'colegio', 'livraria', 'mente', 'jovem', 'kumon']],
]

export const CATEGORY_TONES = { Moradia: 'brand', Alimentação: 'orange', Gastronomia: 'pink', Transporte: 'teal' }
export const CATEGORY_COLORS = { brand: '#635bff', orange: '#f2a94a', pink: '#e84393', teal: '#57b9ad', gray: '#e7e8f2' }

export function inferCategory(merchant) {
  const text = String(merchant || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!text.trim()) return null
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => text.includes(keyword))) return category
  }
  return null
}

export function accountUser(currentUser) {
  const account = currentUser
  const email = account?.email || ''
  const display = account?.displayName || email.split('@')[0] || 'Usuário'
  const parts = display.trim().split(/\s+/).filter(Boolean)
  const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : display.slice(0, 2).toUpperCase()
  return { name: parts[0] || 'Usuário', fullName: display, initials }
}

export function todayLocalISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function parseTransactionDate(dateString, fallback = new Date()) {
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

export function parseMoneyInput(str) {
  if (str === undefined || str === null) return NaN
  const cleaned = String(str)
    .replace(/[R$\s]/g, '')
    .trim()
  if (!cleaned) return NaN
  const normalized = cleaned.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const number = Number(normalized)
  return Number.isFinite(number) ? number : NaN
}

export function parseAmount(transaction) {
  if (typeof transaction.amount === 'number' && Number.isFinite(transaction.amount)) return transaction.amount
  const raw = String(transaction.value || '')
  const match = raw.match(/[-−]?[\d.,]+/)
  if (!match) return 0
  const normalized = match[0]
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
    .replace('−', '-')
  const number = Number(normalized)
  if (!Number.isFinite(number)) return 0
  return /[-−]/.test(raw) ? -Math.abs(number) : Math.abs(number)
}

export function isExpense(transaction) {
  if (transaction.kind === 'gasto') return true
  const value = String(transaction.value || '').trim()
  return value.includes('−') || value.startsWith('-')
}

export function formatBRL(number) {
  const abs = Math.abs(number)
  const [int, dec] = abs.toFixed(2).split('.')
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`
}

export function formatBRLNoDecimals(number) {
  return `R$ ${Math.round(Math.abs(number))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

export function formatBRLShort(number) {
  const abs = Math.abs(number)
  if (abs >= 1000) {
    const k = abs / 1000
    return `R$ ${k.toFixed(1).replace('.', ',')}k`
  }
  return `R$ ${Math.round(abs)}`
}

export function categoryType(category) {
  if (category === 'Moradia') return 'home'
  if (category === 'Transporte') return 'transport'
  if (category === 'Gastronomia') return 'food'
  return 'food'
}

export function subscriptionType(name) {
  const normalized = String(name || '').toLowerCase()
  if (normalized.includes('netflix')) return 'netflix'
  if (normalized.includes('spotify')) return 'spotify'
  if (normalized.includes('gym')) return 'gym'
  return 'other'
}

export function toISO(dateString) {
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

export function formatChargeDate(iso) {
  if (!iso) return ''
  const [year, month, day] = String(iso).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.getDate()} ${MONTH_LABELS[date.getMonth()]}.`
}

export function findDuplicate(transactions, candidate) {
  const merchant = candidate.merchant.trim().toLowerCase()
  const candidateDay = parseTransactionDate(candidate.date).toDateString()
  const candidateAmount = Math.abs(candidate.amount)
  return transactions.find((transaction) => {
    if (transaction.id === candidate.id) return false
    if (
      String(transaction.merchant || '')
        .trim()
        .toLowerCase() !== merchant
    )
      return false
    if (Math.abs(Math.abs(parseAmount(transaction)) - candidateAmount) > 0.009) return false
    if (parseTransactionDate(transaction.date).toDateString() !== candidateDay) return false
    return true
  })
}

export function buildStats(transactions) {
  const now = new Date()
  const thisKey = monthKey(now)
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevKey = monthKey(prevDate)
  let receitas = 0
  let despesas = 0
  let prevReceitas = 0
  let prevDespesas = 0
  transactions.forEach((transaction) => {
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
  const arrow = (value) => (value >= 0 ? `↑ ${value.toFixed(1)}%` : `↓ ${Math.abs(value).toFixed(1)}%`)
  const hasPrevious = prevReceitas > 0 || prevDespesas > 0
  const saldo = receitas - despesas
  const prevSaldo = prevReceitas - prevDespesas
  return [
    {
      label: 'Saldo atual',
      value: formatBRL(saldo),
      change: hasPrevious ? arrow(pctChange(saldo, prevSaldo)) : '—',
      icon: '◈',
      tone: 'brand',
    },
    {
      label: 'Receitas',
      value: formatBRL(receitas),
      change: hasPrevious ? arrow(pctChange(receitas, prevReceitas)) : '—',
      icon: '↗',
      tone: 'green',
    },
    {
      label: 'Despesas',
      value: formatBRL(despesas),
      change: hasPrevious ? arrow(pctChange(despesas, prevDespesas)) : '—',
      icon: '↘',
      tone: 'red',
      down: pctChange(despesas, prevDespesas) > 0,
    },
  ]
}

export function buildChartSeries(transactions, monthCount = 12) {
  const now = new Date()
  const months = []
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: monthKey(date), label: MONTH_LABELS[date.getMonth()] })
  }
  const buckets = Object.fromEntries(months.map((month) => [month.key, { despesas: 0, receitas: 0 }]))
  transactions.forEach((transaction) => {
    const bucket = buckets[monthKey(parseTransactionDate(transaction.date))]
    if (!bucket) return
    const amount = Math.abs(parseAmount(transaction))
    if (isExpense(transaction)) bucket.despesas += amount
    else bucket.receitas += amount
  })
  let saldo = 0
  return months.map((month) => {
    const bucket = buckets[month.key]
    saldo += bucket.receitas - bucket.despesas
    return { ...bucket, saldo, label: month.label }
  })
}

export function buildMonthlySummary(transactions) {
  const summary = {}
  transactions.forEach((transaction) => {
    const key = monthKey(parseTransactionDate(transaction.date))
    if (!summary[key]) summary[key] = { receitas: 0, despesas: 0, total: 0 }
    const amount = Math.abs(parseAmount(transaction))
    if (isExpense(transaction)) {
      summary[key].despesas += amount
    } else {
      summary[key].receitas += amount
    }
    summary[key].total += 1
  })
  return Object.entries(summary)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => ({ mes: key, ...data }))
}

export function buildTopExpensesByMonth(transactions, limit = 3) {
  const byMonth = {}
  transactions.forEach((transaction) => {
    if (!isExpense(transaction)) return
    const key = monthKey(parseTransactionDate(transaction.date))
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push({
      estabelecimento: transaction.merchant,
      categoria: transaction.category || 'Outros',
      valor: Math.abs(parseAmount(transaction)),
      data: transaction.date,
    })
  })
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      mes: key,
      maiores: items.sort((a, b) => b.valor - a.valor).slice(0, limit),
    }))
}

export function buildTrends(transactions) {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(monthKey(date))
  }
  const byMonth = {}
  transactions.forEach((transaction) => {
    const key = monthKey(parseTransactionDate(transaction.date))
    if (!byMonth[key]) byMonth[key] = { receitas: 0, despesas: 0 }
    const amount = Math.abs(parseAmount(transaction))
    if (isExpense(transaction)) byMonth[key].despesas += amount
    else byMonth[key].receitas += amount
  })
  const trends = []
  for (let i = 1; i < months.length; i++) {
    const prev = byMonth[months[i - 1]] || { receitas: 0, despesas: 0 }
    const curr = byMonth[months[i]] || { receitas: 0, despesas: 0 }
    const variationDespesas = prev.despesas > 0 ? ((curr.despesas - prev.despesas) / prev.despesas * 100) : null
    const variationReceitas = prev.receitas > 0 ? ((curr.receitas - prev.receitas) / prev.receitas * 100) : null
    trends.push({
      mes: months[i],
      despesas: curr.despesas,
      receitas: curr.receitas,
      variacaoDespesas: variationDespesas !== null ? Math.round(variationDespesas) : null,
      variacaoReceitas: variationReceitas !== null ? Math.round(variationReceitas) : null,
    })
  }
  return trends
}

export function buildCategoryAverages(transactions) {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const totals = {}
  const counts = {}
  transactions.forEach((transaction) => {
    if (!isExpense(transaction)) return
    const txDate = parseTransactionDate(transaction.date)
    if (txDate < sixMonthsAgo) return
    const category = transaction.category || 'Outros'
    totals[category] = (totals[category] || 0) + Math.abs(parseAmount(transaction))
    counts[category] = (counts[category] || 0) + 1
  })
  const months = 6
  return Object.entries(totals)
    .map(([category, total]) => ({
      categoria: category,
      mediaMensal: Math.round(total / months * 100) / 100,
      totalPeriodo: Math.round(total * 100) / 100,
      totalTransacoes: counts[category],
    }))
    .sort((a, b) => b.mediaMensal - a.mediaMensal)
}

export function buildRecurring(transactions) {
  const byMerchant = {}
  transactions.forEach((transaction) => {
    if (!isExpense(transaction)) return
    const key = transaction.merchant.trim().toLowerCase()
    if (!byMerchant[key]) byMerchant[key] = { nome: transaction.merchant, categoria: transaction.category || 'Outros', valores: [], datas: [] }
    byMerchant[key].valores.push(Math.abs(parseAmount(transaction)))
    byMerchant[key].datas.push(transaction.date)
  })
  return Object.values(byMerchant)
    .filter((item) => item.valores.length >= 2)
    .map((item) => ({
      nome: item.nome,
      categoria: item.categoria,
      vezes: item.valores.length,
      media: Math.round(item.valores.reduce((a, b) => a + b, 0) / item.valores.length * 100) / 100,
      total: Math.round(item.valores.reduce((a, b) => a + b, 0) * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total)
}

export function buildTopExpensesAnual(transactions, limit = 5) {
  const now = new Date()
  const yearStr = String(now.getFullYear())
  const expenses = transactions
    .filter((t) => isExpense(t) && monthKey(parseTransactionDate(t.date)).startsWith(yearStr))
    .map((t) => ({
      estabelecimento: t.merchant,
      categoria: t.category || 'Outros',
      valor: Math.abs(parseAmount(t)),
      data: t.date,
    }))
    .sort((a, b) => b.valor - a.valor)
  return expenses.slice(0, limit)
}

export function buildCategories(transactions, period = 'month') {
  const now = new Date()
  const currentMonthKey = monthKey(now)
  let selectedKey = currentMonthKey
  if (period === 'prevMonth') {
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    selectedKey = monthKey(prevDate)
  } else if (period === '6months' || period === '12months') {
    selectedKey = null
  }
  const totals = {}
  transactions.forEach((transaction) => {
    if (!isExpense(transaction)) return
    const txKey = monthKey(parseTransactionDate(transaction.date))
    if (selectedKey && txKey !== selectedKey) return
    if (period === '6months') {
      const txDate = parseTransactionDate(transaction.date)
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      if (txDate < sixMonthsAgo) return
    } else if (period === '12months') {
      const txDate = parseTransactionDate(transaction.date)
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      if (txDate < twelveMonthsAgo) return
    }
    const category = transaction.category || 'Outros'
    totals[category] = (totals[category] || 0) + Math.abs(parseAmount(transaction))
  })
  const list = Object.entries(totals)
    .map(([label, value]) => ({ label, value, tone: CATEGORY_TONES[label] || 'gray' }))
    .sort((a, b) => b.value - a.value)
  const total = list.reduce((sum, category) => sum + category.value, 0)
  return { list, total }
}

export function buildInsight(transactions, subscriptions) {
  const now = new Date()
  const currentMonthKey = monthKey(now)
  const expenses = transactions.filter((transaction) => {
    if (!isExpense(transaction)) return false
    return monthKey(parseTransactionDate(transaction.date)) === currentMonthKey
  })
  const byCategory = {}
  expenses.forEach((transaction) => {
    const category = transaction.category || 'Outros'
    byCategory[category] = (byCategory[category] || 0) + Math.abs(parseAmount(transaction))
  })
  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
  const totalDespesas = Object.values(byCategory).reduce((sum, value) => sum + value, 0)
  const subTotal = subscriptions.reduce((sum, subscription) => sum + Math.abs(parseAmount(subscription)), 0)
  const parts = []
  if (top) {
    const pct = totalDespesas > 0 ? Math.round((top[1] / totalDespesas) * 100) : 0
    parts.push(`Sua maior despesa em ${MONTH_LABELS[now.getMonth()]} é ${top[0]} (${formatBRL(top[1])}, ${pct}% do total)`)
  }
  if (subTotal > 0) parts.push(`suas assinaturas somam ${formatBRL(subTotal)} por mês`)
  if (parts.length) return `${parts.join('. ')}.`
  return 'Acompanhe seus gastos para identificar oportunidades de economia.'
}
