import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { sendEmailVerification } from 'firebase/auth'
import { auth } from '../firebase'
import styles from '../Dashboard.module.css'

export function VerifyEmail({ email, onRefresh }) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((current) => current - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function resend() {
    if (busy || cooldown > 0) return
    setBusy(true)
    setStatus('')
    try {
      await sendEmailVerification(auth.currentUser)
      setStatus('E-mail de verificação enviado! Confira sua caixa de entrada e também a pasta de spam.')
      setCooldown(30)
    } catch (error) {
      console.error('Falha ao reenviar a verificação de e-mail.', error.code)
      const messages = {
        'auth/too-many-requests': 'Muitos e-mails enviados. Aguarde alguns minutos.',
        'auth/network-request-failed': 'Falha de conexão. Tente novamente.',
        'auth/invalid-action-code': 'O link de verificação expirou. Clique em reenviar.',
      }
      setStatus(messages[error.code] || 'Não foi possível enviar o e-mail. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.landing}>
      <header className={styles.landingNav}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>✦</span>
          <div className={styles.logoText}>
            FinAI<div className={styles.logoSub}>Automação Financeira</div>
          </div>
        </div>
      </header>
      <main className={styles.authPage}>
        <div className={styles.authCard}>
          <h1>Confirme seu e-mail</h1>
          <p>
            Enviamos um link de confirmação para <b>{email}</b>. Clique no link recebido para ativar sua conta antes de usar o painel.
          </p>
          {status && (
            <div className={styles.verifyNotice} role="alert">
              {status}
            </div>
          )}
          <button className={styles.authSubmit} onClick={resend} disabled={busy || cooldown > 0}>
            {cooldown > 0 ? `Reenviar (${cooldown}s)` : busy ? 'Enviando…' : 'Reenviar e-mail'}
          </button>
          <button className={styles.authSwitch} onClick={onRefresh}>
            Já verifiquei — entrar
          </button>
        </div>
      </main>
      <footer className={styles.landingFooter}>FinAI — o radar para as suas finanças</footer>
    </div>
  )
}

VerifyEmail.propTypes = {
  email: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
}
