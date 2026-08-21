import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { getIdToken } from 'firebase/auth'
import { auth, db } from '../firebase'
import styles from '../Dashboard.module.css'
import { buildMonthlySummary, buildTopExpensesByMonth } from '../lib/finance'

const FINAI_AI_ENDPOINT = 'https://bitcoiniciantes-ia.bitcoiniciantes.workers.dev/v1/finai-assistant'
const userCollection = 'usuarios'

function renderMarkdown(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const lines = escaped.split(/\r?\n/)
  let html = ''
  let inList = false
  const closeList = () => {
    if (inList) {
      html += '</ul>'
      inList = false
    }
  }
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (/^#{1,3}\s+/.test(trimmed)) {
      closeList()
      html += `<b>${trimmed.replace(/^#{1,3}\s+/, '')}</b><br/>`
    } else if (/^[*•-]\s+/.test(trimmed)) {
      if (!inList) {
        html += '<ul>'
        inList = true
      }
      html += `<li>${trimmed.replace(/^[*•-]\s+/, '')}</li>`
    } else if (/^\d+[.)]\s+/.test(trimmed)) {
      if (!inList) {
        html += '<ul>'
        inList = true
      }
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

export function AssistantPanel({ data, stats, userId }) {
  const [messages, setMessages] = useState([{ role: 'model', text: 'Olá! Posso analisar seus gastos, receitas e assinaturas.' }])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  useEffect(() => {
    getDoc(doc(db, userCollection, userId, 'assistente', 'conversa'))
      .then((snapshot) => {
        const saved = snapshot.data()?.messages
        if (Array.isArray(saved)) setMessages(saved.slice(-30))
      })
      .catch((error) => console.warn('Histórico do assistente indisponível.', error))
      .finally(() => setHistoryLoaded(true))
  }, [userId])

  useEffect(() => {
    if (!historyLoaded) return
    setDoc(
      doc(db, userCollection, userId, 'assistente', 'conversa'),
      { messages: messages.slice(-30), updatedAt: new Date().toISOString() },
      { merge: true },
    ).catch((error) => console.warn('Não foi possível salvar o histórico do assistente.', error))
  }, [messages, historyLoaded, userId])

  async function sendMessage(event) {
    event.preventDefault()
    const question = prompt.trim()
    if (!question || loading) return
    setPrompt('')
    setMessages((current) => [...current, { role: 'user', text: question }])
    setLoading(true)
    try {
      const token = await getIdToken(auth.currentUser)
      const monthlySummary = buildMonthlySummary(data.transactions)
      const topExpenses = buildTopExpensesByMonth(data.transactions, 3)
      const recentTransactions = data.transactions.slice(-50)
      const response = await fetch(FINAI_AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          question,
          context: {
            resumoMensal: monthlySummary,
            maioresDespesasPorMes: topExpenses,
            transacoes: recentTransactions,
            assinaturas: data.subscriptions,
            resumo: stats,
          },
        }),
      })
      const result = await response.json()
      if (!response.ok || typeof result.answer !== 'string') throw new Error(result.error || 'Resposta indisponível')
      setMessages((current) => [...current, { role: 'model', provider: result.provider, text: result.answer }])
    } catch (error) {
      console.error('Falha ao consultar o Assistente IA.', error)
      const detail = error && error.message ? error.message : String(error || 'erro desconhecido')
      setMessages((current) => [...current, { role: 'error', text: `Não foi possível consultar o assistente agora. (${detail})` }])
    } finally {
      setLoading(false)
    }
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

  return (
    <article className={`${styles.card} ${styles.panel} ${styles.assistantPanel}`}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Conversa com o FinAI</h2>
        <span className={styles.panelActions}>
          <span className={styles.sparkle}>✦</span>
          <button className={styles.chatClear} onClick={clearConversation} disabled={loading}>
            Limpar conversa
          </button>
        </span>
      </div>
      <form className={styles.chatForm} onSubmit={sendMessage}>
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ex.: onde posso economizar?"
          aria-label="Mensagem para o assistente"
        />
        <button type="submit" disabled={loading || !prompt.trim()}>
          Enviar
        </button>
      </form>
      <div className={styles.chatMessages}>
        {loading && <div className={`${styles.chatMessage} ${styles.model}`}>Analisando seus dados…</div>}
        {messages
          .slice()
          .reverse()
          .map((message, index) => (
            <div key={`${message.role}-${index}`} className={`${styles.chatMessage} ${styles[message.role]}`}>
              {message.provider && (
                <small className={styles.chatProvider}>Respondido por: {message.provider === 'groq' ? 'Groq' : 'Gemini'}</small>
              )}
              <span dangerouslySetInnerHTML={{ __html: renderMarkdown(message.text) }} />
            </div>
          ))}
      </div>
    </article>
  )
}

AssistantPanel.propTypes = {
  data: PropTypes.shape({ transactions: PropTypes.array, subscriptions: PropTypes.array }).isRequired,
  stats: PropTypes.array.isRequired,
  userId: PropTypes.string.isRequired,
}
