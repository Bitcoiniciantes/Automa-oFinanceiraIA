import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth, db } from './firebase'
import styles from './Dashboard.module.css'
import { Sidebar, Topbar } from './components/Navigation'
import { NAV_ITEMS } from './components/navItems.jsx'
import { StatCard, ChartPanel, CategoryPanel, InsightCard } from './components/OverviewPanels'
import { ExpenseForm, TransactionList } from './components/Transactions'
import { SubscriptionRadar } from './components/Subscriptions'
import { AssistantPanel } from './components/Assistant'
import { MonthlyReport } from './components/Report'
import { accountUser, buildInsight, buildStats, parseTransactionDate } from './lib/finance'

const userCollection = 'usuarios'
const PAGE_ROUTES = {
  '/': 'Visão geral',
  '/lancamentos': 'Lançamentos',
  '/assinaturas': 'Assinaturas',
  '/relatorio': 'Relatório',
  '/assistente': 'Assistente IA',
}
const ROUTES_BY_PAGE = Object.fromEntries(Object.entries(PAGE_ROUTES).map(([path, label]) => [label, path]))

function pickDefined(obj) {
  if (!obj || typeof obj !== 'object') return {}
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== ''))
}

async function fetchDashboardData(userId) {
  const userRef = doc(db, userCollection, userId)
  const userSnapshot = await getDoc(userRef)
  const [transactionsSnapshot, subscriptionsSnapshot] = await Promise.all([
    getDocs(collection(userRef, 'transacoes')),
    getDocs(collection(userRef, 'assinaturas')),
  ])
  return {
    user: { ...accountUser(auth.currentUser), ...pickDefined(userSnapshot.exists() ? { name: userSnapshot.data().name } : {}) },
    transactions: transactionsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    subscriptions: subscriptionsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
  }
}

export default function Dashboard({ userId }) {
  const [data, setData] = useState(() => ({ user: accountUser(auth.currentUser), transactions: [], subscriptions: [] }))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    fetchDashboardData(userId)
      .then((result) => {
        if (!cancelled) {
          setLoadError('')
          setData(result)
        }
      })
      .catch((error) => {
        console.error('Não foi possível carregar o dashboard do Firestore.', error)
        if (!cancelled) setLoadError('Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  function onNavigate(label) {
    setMobileMenuOpen(false)
    navigate(ROUTES_BY_PAGE[label])
  }

  function applyChange(kind, change) {
    setData((current) => {
      let nextList = current[kind]
      if (change.removed) nextList = current[kind].filter((item) => item.id !== change.removed)
      else if (change.updated) nextList = [change.updated, ...current[kind].filter((item) => item.id !== change.updated.id)]
      else if (change.added) nextList = [change.added, ...current[kind]]
      return { ...current, [kind]: nextList }
    })
  }

  const stats = useMemo(() => buildStats(data.transactions), [data.transactions])
  const insight = useMemo(() => buildInsight(data.transactions, data.subscriptions), [data.transactions, data.subscriptions])
  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('pt-BR')
    if (!query) return data.transactions
    return data.transactions.filter((transaction) =>
      [transaction.merchant, transaction.category, transaction.value, transaction.date].some((field) =>
        String(field || '')
          .toLocaleLowerCase('pt-BR')
          .includes(query),
      ),
    )
  }, [data.transactions, searchQuery])

  const recentTransactions = useMemo(
    () => [...data.transactions].sort((a, b) => parseTransactionDate(b.date) - parseTransactionDate(a.date)).slice(0, 3),
    [data.transactions],
  )

  const activeItem = PAGE_ROUTES[location.pathname] || 'Visão geral'
  const status = loading ? 'Carregando dados…' : 'Dados sincronizados'

  const pageContent =
    activeItem === 'Visão geral' ? (
      <>
        <section>
          <div className={styles.dataStatus} aria-live="polite">
            {status}
          </div>
          <div className={styles.stats}>
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
          <ChartPanel transactions={data.transactions} />
          <div className={styles.lower}>
            <TransactionList
              userId={userId}
              transactions={recentTransactions}
              onChanged={(change) => applyChange('transactions', change)}
            />
            <CategoryPanel transactions={data.transactions} />
          </div>
        </section>
        <aside className={styles.side}>
          <SubscriptionRadar
            userId={userId}
            subscriptions={data.subscriptions}
            onChanged={(change) => applyChange('subscriptions', change)}
          />
          <InsightCard insight={insight} onNavigate={onNavigate} />
        </aside>
      </>
    ) : activeItem === 'Lançamentos' ? (
      <section>
        <div className={styles.pageIntro}>
          <h2>Lançamentos</h2>
          <p>Cadastre, edite ou exclua seus lançamentos.</p>
        </div>
        <ExpenseForm
          userId={userId}
          transactions={data.transactions}
          onSaved={(transaction) => applyChange('transactions', { added: transaction })}
        />
        <TransactionList userId={userId} transactions={filteredTransactions} onChanged={(change) => applyChange('transactions', change)} />
      </section>
    ) : activeItem === 'Assinaturas' ? (
      <section>
        <div className={styles.pageIntro}>
          <h2>Assinaturas</h2>
          <p>Acompanhe, adicione ou edite suas assinaturas.</p>
        </div>
        <SubscriptionRadar
          userId={userId}
          subscriptions={data.subscriptions}
          onChanged={(change) => applyChange('subscriptions', change)}
        />
      </section>
    ) : activeItem === 'Relatório' ? (
      <div className={styles.reportPageWrap}>
        <MonthlyReport transactions={data.transactions} user={data.user} />
      </div>
    ) : (
      <section>
        <div className={styles.pageIntro}>
          <h2>Assistente IA</h2>
          <p>Faça perguntas sobre seus dados financeiros.</p>
        </div>
        <AssistantPanel data={data} stats={stats} userId={userId} />
      </section>
    )

  return (
    <div className={styles.app}>
      <div className={styles.appBody}>
        <Sidebar activeItem={activeItem} onNavigate={onNavigate} subscriptionCount={data.subscriptions.length} />
        <main>
          {loadError && (
            <div className={styles.errorBanner} role="alert">
              <span>{loadError}</span>
              <button onClick={() => setLoadError('')}>Fechar</button>
            </div>
          )}
          <Topbar
            user={data.user}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchOpen={searchOpen}
            onToggleSearch={() => setSearchOpen((open) => !open)}
            onToggleMenu={() => setMobileMenuOpen((open) => !open)}
          />
          <div className={styles.content}>{pageContent}</div>
        </main>
      </div>
      <footer className={styles.footer}>
        <span>
          <b>FinAI</b> · Automação Financeira
        </span>
        <span>© {new Date().getFullYear()} FinAI — o radar para as suas finanças</span>
      </footer>
      {mobileMenuOpen && (
        <div className={styles.mobileNavOverlay} onClick={() => setMobileMenuOpen(false)}>
          <div className={styles.mobileNavPanel} onClick={(event) => event.stopPropagation()}>
            <div className={styles.logo}>
              <span className={styles.logoMark}>✦</span>
              <span className={styles.logoText}>
                FinAI<small className={styles.logoSub}>Automação Financeira</small>
              </span>
            </div>
            <nav className={styles.nav}>
              {NAV_ITEMS.map(([label, icon]) => (
                <button key={label} className={activeItem === label ? styles.active : ''} onClick={() => onNavigate(label)}>
                  <span className={styles.navIcon}>{icon}</span>
                  {label}
                  {label === 'Assinaturas' && <span className={styles.navBadge}>{data.subscriptions.length}</span>}
                </button>
              ))}
            </nav>
            <button className={styles.sidebarSignOut} onClick={() => signOut(auth)}>
              Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

Dashboard.propTypes = {
  userId: PropTypes.string.isRequired,
}
