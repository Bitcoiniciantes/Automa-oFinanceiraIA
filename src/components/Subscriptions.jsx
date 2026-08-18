import { useState } from 'react'
import PropTypes from 'prop-types'
import { collection, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import styles from '../Dashboard.module.css'
import { formatChargeDate, parseAmount, parseMoneyInput, subscriptionType, todayLocalISO } from '../lib/finance'

const userCollection = 'usuarios'

export function SubscriptionRadar({ userId, subscriptions, onChanged }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)

  function startEdit(subscription) {
    setEditingId(subscription.id)
    setError('')
    setDraft({
      name: subscription.name || '',
      value: Math.abs(parseAmount(subscription)).toFixed(2).replace('.', ','),
      nextCharge: subscription.chargeDate || todayLocalISO(),
    })
  }

  async function saveEdit(event) {
    event.preventDefault()
    if (!draft) return
    const amount = parseMoneyInput(draft.value)
    if (!draft.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Informe um nome e um valor válido.')
      return
    }
    setBusy(true)
    try {
      const next = {
        name: draft.name.trim(),
        initials: draft.name.trim().slice(0, 2).toUpperCase(),
        type: subscriptionType(draft.name),
        chargeDate: draft.nextCharge,
        nextCharge: formatChargeDate(draft.nextCharge),
        value: `R$ ${amount.toFixed(2).replace('.', ',')}`,
        amount,
      }
      await updateDoc(doc(db, userCollection, userId, 'assinaturas', editingId), next)
      onChanged({ updated: { id: editingId, ...next } })
      setEditingId(null)
      setDraft(null)
    } catch (saveError) {
      console.error('Não foi possível atualizar a assinatura.', saveError)
      setError(saveError.message || 'Não foi possível atualizar a assinatura.')
    } finally {
      setBusy(false)
    }
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
    } finally {
      setBusy(false)
    }
  }

  function saveSubscription(subscription) {
    onChanged({ added: subscription })
    setShowForm(false)
  }

  return (
    <article className={`${styles.card} ${styles.panel}`}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Radar de assinaturas</h2>
        <button className={styles.select} onClick={() => setShowForm((current) => !current)}>
          {showForm ? 'Fechar' : 'Nova assinatura'}
        </button>
      </div>
      {error && (
        <div className={styles.authError} role="alert">
          {error}
        </div>
      )}
      {showForm && <SubscriptionForm userId={userId} onSaved={saveSubscription} />}
      {subscriptions.length === 0 ? (
        <div className={styles.listEmpty}>Nenhuma assinatura cadastrada.</div>
      ) : (
        subscriptions.map((subscription) =>
          editingId === subscription.id ? (
            <form key={subscription.id} className={styles.subRow} onSubmit={saveEdit}>
              <div className={styles.subEditFields}>
                <input
                  value={draft?.name || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  aria-label="Nome da assinatura"
                />
                <input
                  value={draft?.value || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))}
                  inputMode="decimal"
                  aria-label="Valor"
                />
                <input
                  type="date"
                  value={draft?.nextCharge || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, nextCharge: event.target.value }))}
                  aria-label="Próxima cobrança"
                />
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
            <div className={styles.subscription} key={subscription.id}>
              <span className={`${styles.subLogo} ${styles[subscription.type] || styles.other}`}>{subscription.initials}</span>
              <div className={styles.grow}>
                <b>{subscription.name}</b>
                <small>Próxima cobrança: {subscription.nextCharge}</small>
              </div>
              <strong>{subscription.value}</strong>
              {subscription.id && (
                <div className={styles.rowActions}>
                  <button className={styles.rowAction} onClick={() => startEdit(subscription)} aria-label={`Editar ${subscription.name}`}>
                    Editar
                  </button>
                  <button
                    className={`${styles.rowAction} ${styles.danger}`}
                    onClick={() => {
                      void removeSubscription(subscription.id)
                    }}
                    aria-label={`Excluir ${subscription.name}`}
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ),
        )
      )}
    </article>
  )
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
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Informe o nome e um valor válido.')
      return
    }
    setSaving(true)
    try {
      const ref = doc(collection(db, userCollection, userId, 'assinaturas'))
      const subscription = {
        name: form.name.trim(),
        initials: form.name.trim().slice(0, 2).toUpperCase(),
        type: subscriptionType(form.name),
        chargeDate: form.nextCharge,
        nextCharge: formatChargeDate(form.nextCharge),
        value: `R$ ${amount.toFixed(2).replace('.', ',')}`,
        amount,
      }
      await setDoc(ref, subscription)
      onSaved({ id: ref.id, ...subscription })
      setForm(emptyForm())
    } catch (saveError) {
      console.error('Não foi possível salvar a assinatura.', saveError)
      setError(saveError.message || 'Não foi possível salvar a assinatura.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.expenseForm} onSubmit={submit}>
      <div className={styles.subGrid}>
        <label>
          Nome
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ex.: Netflix"
          />
        </label>
        <label>
          Valor
          <input
            value={form.value}
            onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            inputMode="decimal"
            placeholder="0,00"
          />
        </label>
        <label>
          Próxima cobrança
          <input
            type="date"
            value={form.nextCharge}
            onChange={(event) => setForm((current) => ({ ...current, nextCharge: event.target.value }))}
            required
          />
        </label>
        <button className={styles.submitBtn} type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Adicionar'}
        </button>
      </div>
      {error && (
        <div className={styles.authError} role="alert">
          {error}
        </div>
      )}
    </form>
  )
}

SubscriptionRadar.propTypes = {
  userId: PropTypes.string.isRequired,
  subscriptions: PropTypes.array.isRequired,
  onChanged: PropTypes.func.isRequired,
}

SubscriptionForm.propTypes = {
  userId: PropTypes.string.isRequired,
  onSaved: PropTypes.func.isRequired,
}
