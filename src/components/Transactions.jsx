import { useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { collection, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore'
import { getIdToken } from 'firebase/auth'
import { auth, db } from '../firebase'
import styles from '../Dashboard.module.css'
import {
  CATEGORIES,
  RECEITA_CATEGORIES,
  categoryType,
  findDuplicate,
  inferCategory,
  isExpense,
  parseAmount,
  parseMoneyInput,
  todayLocalISO,
  toISO,
} from '../lib/finance'

const FINAI_AI_ENDPOINT = 'https://bitcoiniciantes-ia.bitcoiniciantes.workers.dev/v1/finai-assistant'
const FINAI_INVOICE_ENDPOINT = FINAI_AI_ENDPOINT.replace('/v1/finai-assistant', '/v1/finai-invoice')
const userCollection = 'usuarios'
const MAX_INVOICE_SIZE = 5 * 1024 * 1024

export function TransactionItem({ transaction, onEdit, onDelete }) {
  const typeClass = transaction.kind === 'gasto' || isExpense(transaction) ? styles.gasto : styles.receita
  return (
    <div className={styles.expense}>
      <span className={`${styles.merchantIcon} ${typeClass}`}>{transaction.initials}</span>
      <div className={styles.expenseInfo}>
        <b>{transaction.merchant}</b>
        <small>
          {transaction.date} · {transaction.category}
        </small>
      </div>
      <span className={styles.expenseValue}>{transaction.value}</span>
      {transaction.id && (
        <div className={styles.rowActions}>
          <button className={styles.rowAction} onClick={onEdit} aria-label={`Editar ${transaction.merchant}`}>
            Editar
          </button>
          <button className={`${styles.rowAction} ${styles.danger}`} onClick={onDelete} aria-label={`Excluir ${transaction.merchant}`}>
            Excluir
          </button>
        </div>
      )}
    </div>
  )
}

export function ExpenseForm({ userId, transactions, onSaved }) {
  const emptyForm = () => ({ merchant: '', value: '', category: 'Alimentação', date: todayLocalISO(), type: 'gasto' })
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
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'type') next.category = value === 'receita' ? RECEITA_CATEGORIES[0] : CATEGORIES[0]
      if (key === 'merchant' && next.type === 'gasto') {
        const inferred = inferCategory(value)
        if (inferred) next.category = inferred
      }
      return next
    })
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
    if (file.size > MAX_INVOICE_SIZE) {
      setError('A nota fiscal deve ter no máximo 5 MB.')
      return
    }
    setSaving(true)
    readInvoice(file)
      .catch((readError) => {
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
    const uploadResponse = await fetch(FINAI_INVOICE_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const uploadResult = await uploadResponse.json()
    if (!uploadResponse.ok) throw new Error(uploadResult.error || 'Falha na leitura da nota fiscal')
    setPendingInvoice({ id: transactionRef.id, path: uploadResult.path || null, name: uploadResult.name, provider: uploadResult.provider })
    const extraction = uploadResult.extraction
    if (extraction) {
      setForm((current) => ({
        ...current,
        merchant: extraction.merchant || current.merchant,
        value: extraction.amount ? extraction.amount.toFixed(2).replace('.', ',') : current.value,
        category: extraction.category || inferCategory(extraction.merchant) || current.category,
        date: extraction.date ? toISO(extraction.date) : current.date,
      }))
      const complete = Boolean(extraction.merchant && extraction.amount && extraction.date)
      setAnalysisStatus(complete ? 'success' : 'warning')
      setAnalysisNotice(
        complete
          ? 'Leitura com sucesso. Revise os dados acima e clique em Salvar gasto.'
          : 'Não foi possível ler todos os campos. Complete ou corrija os dados acima e clique em Salvar gasto.',
      )
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
    const archiveResponse = await fetch(FINAI_INVOICE_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const archiveResult = await archiveResponse.json()
    if (!archiveResponse.ok) throw new Error(archiveResult.error || 'Não foi possível arquivar a nota fiscal')
    return { path: archiveResult.path, name: archiveResult.name, provider: archiveResult.provider }
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (invoice && invoice.size > MAX_INVOICE_SIZE) {
      setError('A nota fiscal deve ter no máximo 5 MB.')
      return
    }
    setSaving(true)
    try {
      if (invoice && !pendingInvoice) {
        await readInvoice(invoice)
        return
      }
      const amount = parseMoneyInput(form.value)
      if (!form.merchant.trim() || !Number.isFinite(amount) || amount <= 0) {
        setError('Informe o estabelecimento e um valor válido.')
        return
      }
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
      const transactionRef = activeInvoice
        ? doc(db, userCollection, userId, 'transacoes', activeInvoice.id)
        : doc(collection(db, userCollection, userId, 'transacoes'))
      const valueStr = form.type === 'receita' ? `R$ ${amount.toFixed(2).replace('.', ',')}` : `− R$ ${amount.toFixed(2).replace('.', ',')}`
      const transaction = {
        merchant: form.merchant.trim(),
        category: form.category,
        date: new Date(`${form.date}T12:00:00`).toLocaleDateString('pt-BR'),
        initials: form.merchant.trim().slice(0, 2).toUpperCase(),
        type: categoryType(form.category),
        kind: form.type,
        value: valueStr,
        amount,
        ...(activeInvoice && activeInvoice.path
          ? { invoicePath: activeInvoice.path, invoiceName: activeInvoice.name, invoiceProvider: activeInvoice.provider || 'gemini' }
          : {}),
      }
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

  const buttonLabel = saving
    ? invoice && !pendingInvoice
      ? 'Lendo nota…'
      : 'Salvando…'
    : invoice && !pendingInvoice
      ? 'Ler nota fiscal'
      : pendingInvoice
        ? 'Salvar despesas'
        : 'Adicionar'
  return (
    <form className={styles.expenseForm} onSubmit={submit} ref={formRef}>
      <div className={styles.formGrid}>
        <label className={`${styles.typeField} ${form.type === 'gasto' ? styles.typeExpense : styles.typeIncome}`}>
          Tipo
          <select value={form.type} onChange={(event) => updateField('type', event.target.value)}>
            <option value="gasto">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </label>
        <label>
          Origem
          <input
            value={form.merchant}
            onChange={(event) => updateField('merchant', event.target.value)}
            placeholder={form.type === 'receita' ? 'Ex.: Empresa X' : 'Ex.: Mercado'}
          />
        </label>
        <label>
          Valor
          <input value={form.value} onChange={(event) => updateField('value', event.target.value)} inputMode="decimal" placeholder="0,00" />
        </label>
        <label>
          Data
          <input type="date" value={form.date} onChange={(event) => updateField('date', event.target.value)} required />
        </label>
        <label>
          Categoria
          <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
            {(form.type === 'receita' ? RECEITA_CATEGORIES : CATEGORIES).map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.formActions}>
        <label className={styles.invoiceInput}>
          Nota fiscal (opcional)
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(event) => {
              void selectInvoice(event.target.files?.[0] || null)
            }}
          />
        </label>
        <button type="submit" disabled={saving}>
          {buttonLabel}
        </button>
      </div>
      {invoice && <small className={styles.fileHint}>Arquivo: {invoice.name}</small>}
      {duplicate && (
        <div className={styles.analysisWarning} role="alert">
          Possível lançamento duplicado: <b>{duplicate.merchant}</b> · {duplicate.value} · {duplicate.date}.<br />
          <span className={styles.dupActions}>
            <button type="button" onClick={confirmDuplicate}>
              Adicionar mesmo assim
            </button>
            <button type="button" onClick={resetForm}>
              Cancelar
            </button>
          </span>
        </div>
      )}
      {analysisNotice && (
        <div className={analysisStatus === 'success' ? styles.analysisSuccess : styles.analysisWarning} role="status" aria-live="polite">
          {analysisNotice}
        </div>
      )}
      {error && (
        <div className={styles.authError} role="alert">
          {error}
        </div>
      )}
    </form>
  )
}

export function TransactionList({ userId, transactions, onChanged }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function startEdit(transaction) {
    setEditingId(transaction.id)
    setError('')
    setDraft({
      merchant: transaction.merchant || '',
      category: transaction.category || 'Outros',
      date: toISO(transaction.date),
      value: Math.abs(parseAmount(transaction)).toFixed(2).replace('.', ','),
      type: isExpense(transaction) ? 'gasto' : 'receita',
    })
  }

  async function saveEdit(event) {
    event.preventDefault()
    if (!draft) return
    const amount = parseMoneyInput(draft.value)
    if (!draft.merchant.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Informe um estabelecimento e um valor válido.')
      return
    }
    setBusy(true)
    try {
      const next = {
        merchant: draft.merchant.trim(),
        category: draft.category,
        date: new Date(`${draft.date}T12:00:00`).toLocaleDateString('pt-BR'),
        initials: draft.merchant.trim().slice(0, 2).toUpperCase(),
        type: categoryType(draft.category),
        kind: draft.type,
        value: draft.type === 'receita' ? `R$ ${amount.toFixed(2).replace('.', ',')}` : `− R$ ${amount.toFixed(2).replace('.', ',')}`,
        amount,
      }
      await updateDoc(doc(db, userCollection, userId, 'transacoes', editingId), next)
      onChanged({ updated: { id: editingId, ...next } })
      setEditingId(null)
      setDraft(null)
    } catch (saveError) {
      console.error('Não foi possível atualizar o gasto.', saveError)
      setError(saveError.message || 'Não foi possível atualizar o gasto.')
    } finally {
      setBusy(false)
    }
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
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`${styles.card} ${styles.panel}`}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Transações recentes</h2>
      </div>
      {error && (
        <div className={styles.authError} role="alert">
          {error}
        </div>
      )}
      {transactions.length === 0 ? (
        <div className={styles.listEmpty}>Nenhuma transação cadastrada ainda.</div>
      ) : (
        transactions.map((transaction) =>
          editingId === transaction.id ? (
            <form key={transaction.id} className={styles.editRow} onSubmit={saveEdit}>
              <div className={styles.editFields}>
                <input
                  value={draft?.merchant || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, merchant: event.target.value }))}
                  aria-label="Estabelecimento"
                />
                <input
                  value={draft?.value || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))}
                  inputMode="decimal"
                  aria-label="Valor"
                />
                <input
                  type="date"
                  value={draft?.date || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                  aria-label="Data"
                />
                <select
                  value={draft?.type || 'gasto'}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      type: event.target.value,
                      category: event.target.value === 'receita' ? RECEITA_CATEGORIES[0] : CATEGORIES[0],
                    }))
                  }
                  aria-label="Tipo"
                >
                  <option value="gasto">Despesa</option>
                  <option value="receita">Receita</option>
                </select>
                <select
                  value={draft?.category || 'Outros'}
                  onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                  aria-label="Categoria"
                >
                  {(draft?.type === 'receita' ? RECEITA_CATEGORIES : CATEGORIES).map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className={styles.rowActions}>
                <button className={styles.rowAction} type="submit" disabled={busy}>
                  Salvar
                </button>
                <button
                  className={styles.rowAction}
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setDraft(null)
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <TransactionItem
              key={transaction.id || `${transaction.merchant}-${transaction.date}`}
              transaction={transaction}
              onEdit={() => startEdit(transaction)}
              onDelete={() => {
                void removeTransaction(transaction.id)
              }}
            />
          ),
        )
      )}
    </article>
  )
}

TransactionItem.propTypes = {
  transaction: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}

ExpenseForm.propTypes = {
  userId: PropTypes.string.isRequired,
  transactions: PropTypes.array.isRequired,
  onSaved: PropTypes.func.isRequired,
}

TransactionList.propTypes = {
  userId: PropTypes.string.isRequired,
  transactions: PropTypes.array.isRequired,
  onChanged: PropTypes.func.isRequired,
}
