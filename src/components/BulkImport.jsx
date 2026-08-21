import { useRef, useState } from 'react'
import PropTypes from 'prop-types'
import * as XLSX from 'xlsx'
import { collection, writeBatch, doc } from 'firebase/firestore'
import { db } from '../firebase'
import styles from '../Dashboard.module.css'
import {
  CATEGORIES,
  RECEITA_CATEGORIES,
  categoryType,
  inferCategory,
  todayLocalISO,
  toISO,
} from '../lib/finance'

const userCollection = 'usuarios'
const EXPECTED_HEADERS = {
  merchant: ['estabelecimento', 'merchant name', 'merchant', 'nome do estabelecimento', 'loja', 'origem', 'descricao', 'description', 'nome', 'name', 'payee', 'beneficiary'],
  value: ['valor', 'value', 'amount', 'preco', 'price', 'total'],
  date: ['data', 'date', 'dt', 'transaction date', 'purchase date'],
  category: ['categoria', 'category', 'cat'],
  type: ['tipo', 'type'],
}

function normalizeHeader(header) {
  const normalized = String(header || '').toLowerCase().trim()
  for (const [key, aliases] of Object.entries(EXPECTED_HEADERS)) {
    if (aliases.some((alias) => normalized.includes(alias))) return key
  }
  return null
}

function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569)
  const utcValue = utcDays * 86400
  const date = new Date(utcValue * 1000)
  return date
}

function parseExcelDate(value) {
  if (!value) return todayLocalISO()
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return todayLocalISO()
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  if (typeof value === 'number' && value > 30000 && value < 50000) {
    const date = excelSerialToDate(value)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const str = String(value).trim()
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) return toISO(str)
  const match = str.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/)
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3]
    return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  }
  return todayLocalISO()
}

function parseExcelValue(value) {
  if (typeof value === 'number') return value
  const str = String(value || '').replace(/[R$\s]/g, '').trim()
  if (!str) return NaN
  const normalized = str.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const number = Number(normalized)
  return Number.isFinite(number) ? number : NaN
}

function detectType(row, mapping) {
  const typeValue = row[mapping.type]
  if (typeValue) {
    const normalized = String(typeValue).toLowerCase().trim()
    if (normalized.includes('receita') || normalized.includes('income') || normalized.includes('entrada')) return 'receita'
    if (normalized.includes('gasto') || normalized.includes('despesa') || normalized.includes('expense') || normalized.includes('saida')) return 'gasto'
  }
  const categoryValue = row[mapping.category]
  if (categoryValue) {
    const normalized = String(categoryValue).toLowerCase().trim()
    if (RECEITA_CATEGORIES.some((c) => c.toLowerCase().includes(normalized))) return 'receita'
  }
  const value = row[mapping.value]
  if (typeof value === 'string' && (value.includes('-') || value.includes('−'))) return 'gasto'
  return 'gasto'
}

function detectCategory(row, mapping, type) {
  const categoryValue = row[mapping.category]
  if (categoryValue) {
    const normalized = String(categoryValue).toLowerCase().trim()
    const categories = type === 'receita' ? RECEITA_CATEGORIES : CATEGORIES
    const found = categories.find((c) => c.toLowerCase().includes(normalized))
    if (found) return found
  }
  const merchantValue = row[mapping.merchant]
  if (merchantValue && type === 'gasto') {
    const inferred = inferCategory(merchantValue)
    if (inferred) return inferred
  }
  return type === 'receita' ? RECEITA_CATEGORIES[0] : CATEGORIES[0]
}

export function BulkImport({ userId, onSaved }) {
  const fileInputRef = useRef(null)
  const [previewData, setPreviewData] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({ merchant: '', value: '', date: '', category: '', type: '' })
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState('upload')
  const [confirmData, setConfirmData] = useState([])

  function buildTransactions() {
    if (!mapping.merchant || !mapping.value) return []
    const idx = { merchant: headers.indexOf(mapping.merchant), value: headers.indexOf(mapping.value), date: headers.indexOf(mapping.date), category: headers.indexOf(mapping.category) }
    const typeIdx = headers.indexOf(mapping.type)
    return previewData.map((row) => {
      const merchant = String(row[idx.merchant] || '').trim()
      const rawValue = row[idx.value]
      const amount = parseExcelValue(rawValue)
      const dateStr = row[idx.date]
      const dateISO = parseExcelDate(dateStr)
      const rowIdx = { merchant: idx.merchant, value: idx.value, date: idx.date, category: idx.category, type: typeIdx }
      const type = detectType(row, rowIdx)
      const category = detectCategory(row, rowIdx, type)
      const valueStr = type === 'receita' ? `R$ ${amount.toFixed(2).replace('.', ',')}` : `− R$ ${amount.toFixed(2).replace('.', ',')}`
      return { merchant, category, date: new Date(`${dateISO}T12:00:00`).toLocaleDateString('pt-BR'), initials: merchant.slice(0, 2).toUpperCase(), type: categoryType(category), kind: type, value: valueStr, amount }
    }).filter((t) => t.merchant && Number.isFinite(t.amount) && t.amount > 0)
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError('')
    setSuccess('')
    setPreviewData([])
    setHeaders([])
    setMapping({ merchant: '', value: '', date: '', category: '', type: '' })
    setStep('upload')

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' })
        if (jsonData.length === 0) {
          setError('O arquivo está vazio.')
          return
        }
        const headerRow = jsonData[0]
        const detectedHeaders = headerRow.map((h) => String(h || '').trim())
        setHeaders(detectedHeaders)
        const autoMapping = { merchant: '', value: '', date: '', category: '', type: '' }
        detectedHeaders.forEach((header) => {
          const normalized = normalizeHeader(header)
          if (normalized) autoMapping[normalized] = header
        })
        setMapping(autoMapping)
        const rows = jsonData.slice(1).filter((row) => row.some((cell) => String(cell || '').trim() !== ''))
        setPreviewData(rows.slice(0, 500))
        setStep('map')
      } catch (parseError) {
        console.error('Erro ao ler arquivo:', parseError)
        setError('Não foi possível ler o arquivo. Verifique o formato.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function updateMapping(field, value) {
    setMapping((current) => ({ ...current, [field]: value }))
  }

  async function handleImport() {
    if (confirmData.length === 0) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const batch = writeBatch(db)
      const colRef = collection(db, userCollection, userId, 'transacoes')
      const saved = []
      for (const transaction of confirmData) {
        const ref = doc(colRef)
        batch.set(ref, transaction)
        saved.push({ id: ref.id, ...transaction })
      }
      await batch.commit()
      setSuccess(`${saved.length} transações importadas com sucesso!`)
      setStep('done')
      saved.forEach((t) => onSaved(t))
    } catch (importError) {
      console.error('Erro ao importar:', importError)
      setError(importError.message || 'Erro ao importar transações.')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setPreviewData([])
    setHeaders([])
    setMapping({ merchant: '', value: '', date: '', category: '', type: '' })
    setFileName('')
    setError('')
    setSuccess('')
    setConfirmData([])
    setStep('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className={styles.bulkImport}>
      <div className={styles.bulkImportHeader}>
        <h3>Importar em lote</h3>
        <p>Importe até 500 transações de uma vez via arquivo Excel (.xlsx) ou CSV.</p>
      </div>

      {step === 'upload' && (
        <div className={styles.bulkUploadArea}>
          <label className={styles.bulkFileInput}>
            Selecionar arquivo
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
            />
          </label>
          <small>Formatos aceitos: .xlsx, .xls, .csv</small>
        </div>
      )}

      {step === 'map' && (
        <>
          <div className={styles.bulkFileInfo}>
            <span>Arquivo: <b>{fileName}</b> ({previewData.length} linhas detectadas)</span>
            <button type="button" onClick={reset} className={styles.bulkResetBtn}>Trocar arquivo</button>
          </div>
          <div className={styles.bulkMapping}>
            <h4>Mapear colunas</h4>
            <div className={styles.bulkMappingGrid}>
              <label>
                Tipo
                <select value={mapping.type} onChange={(e) => updateMapping('type', e.target.value)}>
                  <option value="">Auto-detectar</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
              <label>
                Origem *
                <select value={mapping.merchant} onChange={(e) => updateMapping('merchant', e.target.value)}>
                  <option value="">Selecione</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
              <label>
                Valor *
                <select value={mapping.value} onChange={(e) => updateMapping('value', e.target.value)}>
                  <option value="">Selecione</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
              <label>
                Data
                <select value={mapping.date} onChange={(e) => updateMapping('date', e.target.value)}>
                  <option value="">Hoje</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
              <label>
                Categoria
                <select value={mapping.category} onChange={(e) => updateMapping('category', e.target.value)}>
                  <option value="">Auto-detectar</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className={styles.bulkPreview}>
            <h4>Pré-visualização (até 500 linhas)</h4>
            <div className={styles.bulkTableWrap}>
              <table className={styles.bulkTable}>
                <thead>
                  <tr>
                    {headers.map((h) => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => {
                        const headerName = headers[j]
                        const isDateCol = normalizeHeader(headerName) === 'date'
                        const isValueCol = normalizeHeader(headerName) === 'value'
                        let display = String(cell ?? '')
                        if (isDateCol && typeof cell === 'number' && cell > 30000 && cell < 50000) {
                          const date = excelSerialToDate(cell)
                          display = date.toLocaleDateString('pt-BR')
                        } else if (isDateCol && cell instanceof Date && !Number.isNaN(cell.getTime())) {
                          display = cell.toLocaleDateString('pt-BR')
                        } else if (isValueCol && typeof cell === 'number') {
                          display = `R$ ${cell.toFixed(2).replace('.', ',')}`
                        }
                        return <td key={j}>{display}</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.formActions}>
            {mapping.merchant && mapping.value && mapping.merchant === mapping.value && (
              <div className={styles.analysisWarning} role="alert">
                Os campos Origem e Valor apontam para a mesma coluna. Corrija o mapeamento.
              </div>
            )}
            <button type="button" onClick={() => {
              const txs = buildTransactions()
              if (txs.length === 0) {
                const merchantSample = previewData[0]?.[headers.indexOf(mapping.merchant)]
                const valueSample = previewData[0]?.[headers.indexOf(mapping.value)]
                const valueParsed = parseExcelValue(valueSample)
                let hint = ''
                if (!mapping.merchant || !mapping.value) {
                  hint = 'Mapeie Estabelecimento e Valor.'
                } else if (!Number.isFinite(valueParsed) || valueParsed <= 0) {
                  hint = `A coluna "${mapping.value}" não contém valores numéricos. Verifique se Valor está apontando para a coluna correta.`
                } else if (String(merchantSample || '').trim() === '') {
                  hint = `A coluna "${mapping.merchant}" está vazia. Verifique se Origem está apontando para a coluna correta.`
                } else {
                  hint = 'Verifique se todos os campos estão mapeados para as colunas corretas.'
                }
                setError(hint)
                return
              }
              setError('')
              setConfirmData(txs)
              setStep('confirm')
            }} disabled={saving || !mapping.merchant || !mapping.value || mapping.merchant === mapping.value}>
              Revisar importação
            </button>
            <button type="button" onClick={reset} disabled={saving}>Cancelar</button>
          </div>
        </>
      )}

      {step === 'confirm' && (
        <>
          <div className={styles.bulkFileInfo}>
            <span>Confirme os <b>{confirmData.length}</b> lançamentos abaixo antes de importar</span>
          </div>
          <div className={styles.bulkPreview}>
            <h4>Dados que serão importados</h4>
            <div className={styles.bulkTableWrap}>
              <table className={styles.bulkTable}>
                <thead>
                  <tr>
                    <th>Origem</th>
                    <th>Valor</th>
                    <th>Data</th>
                    <th>Categoria</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmData.map((t, i) => (
                    <tr key={i}>
                      <td>{t.merchant}</td>
                      <td>{t.value}</td>
                      <td>{t.date}</td>
                      <td>{t.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="button" onClick={handleImport} disabled={saving}>
              {saving ? 'Importando…' : `Confirmar importação de ${confirmData.length} transações`}
            </button>
            <button type="button" onClick={() => { setStep('map'); setConfirmData([]) }} disabled={saving}>Voltar e corrigir</button>
          </div>
        </>
      )}

      {step === 'done' && (
        <div className={styles.bulkDone}>
          <p>{success}</p>
          <button type="button" onClick={reset}>Importar outro arquivo</button>
        </div>
      )}

      {error && (
        <div className={styles.authError} role="alert">{error}</div>
      )}
    </div>
  )
}

BulkImport.propTypes = {
  userId: PropTypes.string.isRequired,
  onSaved: PropTypes.func.isRequired,
}