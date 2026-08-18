import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from './firebase'
import Dashboard from './Dashboard'
import styles from './Dashboard.module.css'

export default function AuthGate() {
  const [user, setUser] = useState(() => auth.currentUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registering, setRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  if (user) return <Dashboard userId={user.uid} />

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (registering) await createUserWithEmailAndPassword(auth, email, password)
      else await signInWithEmailAndPassword(auth, email, password)
    } catch (authError) {
      console.error('Falha na autenticação:', authError.code, authError.message)
      const messages = {
        'auth/invalid-credential': 'E-mail ou senha inválidos.',
        'auth/user-not-found': 'Este e-mail não está cadastrado no Firebase.',
        'auth/wrong-password': 'A senha está incorreta.',
        'auth/operation-not-allowed': 'O login por e-mail e senha está desativado no Firebase.',
        'auth/invalid-api-key': 'A configuração do Firebase está inválida.',
        'auth/network-request-failed': 'Falha de conexão. Verifique a internet.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
      }
      setError(messages[authError.code] || `Erro do Firebase: ${authError.code || 'desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const scrollToAuth = () => document.getElementById('authCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const features = [
    { icon: '✦', title: 'Assistente IA', text: 'Pergunte sobre seus gastos e receba respostas na hora, direto no painel.' },
    { icon: '⧉', title: 'Leitura de notas', text: 'Anexe sua nota fiscal e o FinAI extrai valor, local e data automaticamente.' },
    { icon: '◎', title: 'Visão geral', text: 'Renda, gastos e saldo sempre atualizados em um só lugar.' },
    { icon: '◈', title: 'Controle de gastos', text: 'Lance despesas e descubra para onde o seu dinheiro está indo.' },
  ]

  return (
    <div className={styles.landing}>
      <header className={styles.landingNav}>
        <div className={styles.logo}><span className={styles.logoMark}>✦</span><div className={styles.logoText}>FinAI<div className={styles.logoSub}>Automação Financeira</div></div></div>
        <button className={styles.landingCta} onClick={scrollToAuth}>Entrar</button>
      </header>

      <section className={styles.hero}>
        <h1>E se você pudesse conversar com o <span>seu próprio dinheiro</span>?</h1>
        <p className={styles.heroSub}>Esqueça as planilhas chatas. Envie a foto da nota fiscal, o FinAI extrai os dados e organiza tudo. Quer saber para onde foi seu salário? É só perguntar.</p>
        <button className={styles.heroButton} onClick={scrollToAuth}>Ver a mágica acontecer</button>
        <div className={styles.chatDemo}>
          <div className={styles.chatDemoHead}>Assistente FinAI · online</div>
          <div className={styles.chatDemoBody}>
            <div className={`${styles.demoBubble} ${styles.demoUser}`}>Quanto eu gastei com delivery este mês?</div>
            <div className={styles.demoTyping}><span /><span /><span /></div>
            <div className={`${styles.demoBubble} ${styles.demoAi}`}>Você gastou R$ 345,00 em delivery este mês — 15% a menos que no mês passado.</div>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        {features.map(feature => (
          <div className={styles.feature} key={feature.title}>
            <span className={styles.featureIcon}>{feature.icon}</span>
            <b>{feature.title}</b>
            <p>{feature.text}</p>
          </div>
        ))}
      </section>

      <main className={styles.authPage}>
        <form id="authCard" className={styles.authCard} onSubmit={submit}>
          <div className={styles.logo}><span className={styles.logoMark}>✦</span> FinAI</div>
          <h1>{registering ? 'Criar sua conta' : 'Entrar no FinAI'}</h1>
          <p>Acesse seus dados financeiros com segurança.</p>
          <label>E-mail<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></label>
          <label>Senha<input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={6} autoComplete={registering ? 'new-password' : 'current-password'} /></label>
          {error && <div className={styles.authError} role="alert">{error}</div>}
          <button className={styles.authSubmit} disabled={loading}>{loading ? 'Aguarde…' : registering ? 'Criar conta' : 'Entrar'}</button>
          <button type="button" className={styles.authSwitch} onClick={() => { setRegistering(!registering); setError('') }}>{registering ? 'Já tenho uma conta' : 'Criar uma conta'}</button>
        </form>
      </main>

      <footer className={styles.landingFooter}>FinAI — o radar para as suas finanças</footer>
    </div>
  )
}
