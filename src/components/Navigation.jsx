import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import styles from '../Dashboard.module.css'
import { NAV_ITEMS } from './navItems.jsx'

export function Sidebar({ activeItem, onNavigate, subscriptionCount }) {
  return (
    <aside className={styles.sidebar}>
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
            {label === 'Assinaturas' && <span className={styles.navBadge}>{subscriptionCount}</span>}
          </button>
        ))}
      </nav>
      <button className={styles.sidebarSignOut} onClick={() => signOut(auth)}>
        Sair da conta
      </button>
      <div className={styles.upgrade}>
        <b>Faça seu dinheiro render</b>
        <p>Receba insights personalizados com o FinAI Pro.</p>
        <button onClick={() => onNavigate('Assistente IA')}>Conhecer o Pro →</button>
      </div>
    </aside>
  )
}

export function Topbar({ user, searchQuery, onSearchChange, searchOpen, onToggleSearch, onToggleMenu }) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const dateLabel = now
    .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, (char) => char.toUpperCase())
  const [greetingState, setGreetingState] = useState('show')
  useEffect(() => {
    const fade = setTimeout(() => setGreetingState('fading'), 19400)
    const hide = setTimeout(() => setGreetingState('gone'), 20000)
    return () => {
      clearTimeout(fade)
      clearTimeout(hide)
    }
  }, [])
  return (
    <>
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>{dateLabel}</p>
          {greetingState !== 'gone' && (
            <h1 className={`${styles.title} ${greetingState === 'fading' ? styles.titleFade : ''}`}>
              {greeting}, {user.name} <span>👋</span>
            </h1>
          )}
        </div>
        <div className={styles.topActions}>
          <button className={`${styles.iconButton} ${styles.mobileMenu}`} aria-label="Abrir menu" onClick={onToggleMenu}>
            ☰
          </button>
          <button
            className={`${styles.iconButton} ${searchOpen ? styles.iconButtonActive : ''}`}
            aria-label="Buscar lançamentos"
            onClick={onToggleSearch}
          >
            ⌕
          </button>
          <div className={styles.avatar}>
            <span>{user.fullName}</span>
            <span className={styles.avatarFace}>{user.initials}</span>
          </div>
          <button className={styles.signOut} onClick={() => signOut(auth)}>
            Sair
          </button>
        </div>
      </header>
      {searchOpen && (
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar lançamentos por nome, categoria ou valor…"
            aria-label="Buscar lançamentos"
          />
        </div>
      )}
    </>
  )
}

Sidebar.propTypes = {
  activeItem: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  subscriptionCount: PropTypes.number.isRequired,
}

Topbar.propTypes = {
  user: PropTypes.shape({ name: PropTypes.string, fullName: PropTypes.string, initials: PropTypes.string }).isRequired,
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  searchOpen: PropTypes.bool.isRequired,
  onToggleSearch: PropTypes.func.isRequired,
  onToggleMenu: PropTypes.func.isRequired,
}
