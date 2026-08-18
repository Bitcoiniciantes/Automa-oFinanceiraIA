import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from './firebase'
import styles from './Dashboard.module.css'

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

const userCollection = 'usuarios'

function mergeDashboardData(remoteData) {
  return {
    ...mockData,
    ...remoteData,
    user: { ...mockData.user, ...remoteData.user },
    stats: Array.isArray(remoteData.stats) ? remoteData.stats : mockData.stats,
    transactions: Array.isArray(remoteData.transactions) ? remoteData.transactions : mockData.transactions,
    subscriptions: Array.isArray(remoteData.subscriptions) ? remoteData.subscriptions : mockData.subscriptions,
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

export function Sidebar({ activeItem, onNavigate }) {
  const items = [
    ['Visão geral', <DashboardIcon />], ['Meus gastos', <BillIcon />], ['Assinaturas', <WalletIcon />], ['Assistente IA', <BellIcon />],
  ]
  return <aside className={styles.sidebar}>
    <div className={styles.logo}><span className={styles.logoMark}>✦</span> FinAI</div>
    <nav className={styles.nav}>{items.map(([label, icon]) => <button key={label} className={activeItem === label ? styles.active : ''} onClick={() => onNavigate(label)}>{icon}{label}{label === 'Assinaturas' && <span className={styles.navBadge}>3</span>}</button>)}</nav>
    <div className={styles.upgrade}><b>Faça seu dinheiro render</b><p>Receba insights personalizados com o FinAI Pro.</p><button>Conhecer o Pro →</button></div><button className={styles.sidebarSignOut} onClick={() => signOut(auth)}>Sair da conta</button>
  </aside>
}

export function Topbar({ user }) {
  return <header className={styles.topbar}><div><p className={styles.eyebrow}>Segunda-feira, 17 de agosto</p><h1 className={styles.title}>Bom dia, {user.name} <span>👋</span></h1></div><div className={styles.topActions}><button className={`${styles.iconButton} ${styles.mobileMenu}`}>☰</button><button className={styles.iconButton} aria-label="Notificações">⌕<span className={styles.dot}/></button><div className={styles.avatar}><span>{user.fullName}</span><span className={styles.avatarFace}>{user.initials}</span></div><button className={styles.signOut} onClick={() => signOut(auth)}>Sair</button></div></header>
}

export function StatCard({ label, value, change, icon, tone, down }) {
  return <article className={`${styles.card} ${styles.stat}`}><div className={styles.statTop}>{label}<span className={`${styles.statIcon} ${styles[tone]}`}>{icon}</span></div><h2>{value}</h2><span className={`${styles.trend} ${down ? styles.trendDown : ''}`}>{change} <span className={styles.subtle}>vs. mês passado</span></span></article>
}

export function ChartPanel() {
  return <article className={`${styles.card} ${styles.panel}`}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Fluxo financeiro</h2><select className={styles.select} defaultValue="6"><option value="6">Últimos 6 meses</option></select></div><div className={styles.chart}><svg viewBox="0 0 760 220" preserveAspectRatio="none"><g stroke="#eef0f5" strokeWidth="1"><path d="M0 20H760M0 75H760M0 130H760M0 185H760"/></g><path d="M0 161 C60 148, 82 153, 120 126 S195 95, 245 116 S320 105, 365 72 S430 84, 480 59 S548 77, 600 43 S680 51,760 24" fill="none" stroke="#635bff" strokeWidth="3"/><path d="M0 184 C65 172, 89 184, 130 159 S210 166, 250 142 S320 155, 365 128 S430 143, 480 112 S555 133,600 105 S690 120,760 91" fill="none" stroke="#c8c9ff" strokeWidth="3" strokeDasharray="5 5"/><circle cx="760" cy="24" r="4" fill="#635bff"/><g fill="#8c93a8" fontSize="10"><text x="0" y="214">Mar</text><text x="145" y="214">Abr</text><text x="295" y="214">Mai</text><text x="445" y="214">Jun</text><text x="595" y="214">Jul</text><text x="735" y="214">Ago</text></g></svg></div><div className={styles.legend}><span>Saldo acumulado</span><span>Despesas</span></div></article>
}

export function TransactionItem({ transaction }) {
  return <div className={styles.expense}><span className={`${styles.merchantIcon} ${styles[transaction.type]}`}>{transaction.initials}</span><div className={styles.expenseInfo}><b>{transaction.merchant}</b><small>{transaction.date} · {transaction.category}</small></div><span className={styles.expenseValue}>{transaction.value}</span></div>
}

export function TransactionList({ transactions }) {
  return <article className={`${styles.card} ${styles.panel}`}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Transações recentes</h2><button className={styles.select}>Ver todas →</button></div>{transactions.map(transaction => <TransactionItem key={`${transaction.merchant}-${transaction.date}`} transaction={transaction} />)}</article>
}

export function CategoryPanel() {
  const categories = [['Moradia', '51,5%', 'brand'], ['Alimentação', '23,1%', 'orange'], ['Transporte', '14,8%', 'teal'], ['Outros', '10,6%', 'gray']]
  return <article className={`${styles.card} ${styles.panel}`}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Gastos por categoria</h2><select className={styles.select} defaultValue="month"><option value="month">Este mês</option></select></div><div className={styles.donutWrap}><div className={styles.donut}><div className={styles.donutCenter}><div><b>R$ 4.079</b>total</div></div></div><div className={styles.catList}>{categories.map(([label, value, tone]) => <div className={styles.cat} key={label}><i className={styles[tone]}/>{label}<b>{value}</b></div>)}</div></div></article>
}

export function SubscriptionRadar({ subscriptions }) {
  return <article className={`${styles.card} ${styles.panel}`}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Radar de assinaturas</h2><button className={styles.select}>Ver todas →</button></div>{subscriptions.map(subscription => <div className={styles.subscription} key={subscription.name}><span className={`${styles.subLogo} ${styles[subscription.type]}`}>{subscription.initials}</span><div className={styles.grow}><b>{subscription.name}</b><small>Próxima cobrança: {subscription.nextCharge}</small></div><strong>{subscription.value}</strong></div>)}<div className={styles.alert}><span>⚠</span><span><b>Atenção:</b> o preço da Netflix aumentou R$ 5,00 este mês.</span></div></article>
}

export function InsightCard({ insight }) {
  return <article className={`${styles.card} ${styles.panel}`}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Insight do FinAI</h2><span className={styles.sparkle}>✦</span></div><p className={styles.insightText}>{insight}</p><button className={styles.insightLink}>Conversar com o Assistente →</button></article>
}

export default function Dashboard({ userId }) {
  const [data, setData] = useState(mockData)
  const [dataSource, setDataSource] = useState('carregando')
  const [activeItem, setActiveItem] = useState('Visão geral')

  useEffect(() => {
    let cancelled = false

    fetchDashboardData(userId).then(result => {
      if (cancelled) return
      setDataSource(result.source)
      setData(result.data)
    })

    return () => { cancelled = true }
  }, [userId])

  return <div className={styles.app}><Sidebar activeItem={activeItem} onNavigate={setActiveItem}/><main><Topbar user={data.user}/><div className={styles.content}><section><div className={styles.dataStatus} aria-live="polite">{dataSource === 'firestore' ? 'Dados sincronizados' : dataSource === 'fallback' ? 'Exibindo dados de demonstração' : 'Carregando dados…'}</div><div className={styles.stats}>{data.stats.map(stat => <StatCard key={stat.label} {...stat}/>)}</div><ChartPanel/><div className={styles.lower}><TransactionList transactions={data.transactions}/><CategoryPanel/></div></section><aside className={styles.side}><SubscriptionRadar subscriptions={data.subscriptions}/><InsightCard insight={data.insight}/></aside></div></main></div>
}
