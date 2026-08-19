import { useEffect, useState } from 'react'

const WORKER_URL = 'https://floral-truth-af64.bitcoiniciantes.workers.dev'
const SITE_NAME = 'finai'
const WINDOW_HOURS = 24

export function VisitCounter() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    let active = true
    const key = `btc_last_visit_${SITE_NAME}`
    const now = Date.now()
    const lastVisit = Number(localStorage.getItem(key)) || 0
    const withinWindow = now - lastVisit < WINDOW_HOURS * 60 * 60 * 1000
    const endpoint = withinWindow ? '/total' : '/count'
    if (!withinWindow) {
      localStorage.setItem(key, String(now))
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