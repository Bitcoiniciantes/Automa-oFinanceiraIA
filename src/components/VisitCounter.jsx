import { useEffect, useState } from 'react'

const WORKER_URL = 'https://floral-truth-af64.bitcoiniciantes.workers.dev'
const SITE_NAME = 'finai'

export function VisitCounter() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    let active = true
    const today = new Date().toISOString().slice(0, 10)
    const key = `btc_last_visit_${SITE_NAME}`
    const lastVisit = localStorage.getItem(key)
    const endpoint = lastVisit === today ? '/total' : '/count'
    if (lastVisit !== today) {
      localStorage.setItem(key, today)
    }
    fetch(`${WORKER_URL}${endpoint}?site=${SITE_NAME}`)
      .then((r) => r.json())
      .then((data) => {
        if (active && data.count !== undefined) setCount(data.count)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <span>
      visitas: <span id="visit-count">{count !== null ? count.toLocaleString('pt-BR') : '—'}</span>
    </span>
  )
}