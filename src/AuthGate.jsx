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
      setError(authError.code === 'auth/invalid-credential' ? 'E-mail ou senha inválidos.' : 'Não foi possível concluir a autenticação.')
    } finally {
      setLoading(false)
    }
  }

  return <main className={styles.authPage}><form className={styles.authCard} onSubmit={submit}><div className={styles.logo}><span className={styles.logoMark}>✦</span> FinAI</div><h1>{registering ? 'Criar sua conta' : 'Entrar no FinAI'}</h1><p>Acesse seus dados financeiros com segurança.</p><label>E-mail<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></label><label>Senha<input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={6} autoComplete={registering ? 'new-password' : 'current-password'} /></label>{error && <div className={styles.authError} role="alert">{error}</div>}<button className={styles.authSubmit} disabled={loading}>{loading ? 'Aguarde…' : registering ? 'Criar conta' : 'Entrar'}</button><button type="button" className={styles.authSwitch} onClick={() => { setRegistering(!registering); setError('') }}>{registering ? 'Já tenho uma conta' : 'Criar uma conta'}</button></form></main>
}
