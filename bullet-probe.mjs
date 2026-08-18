import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const API_KEY = 'AIzaSyAkxoz7Ex55GGwEtiQsFyUDW-_VlBhIVt4'
const AUTH_URL = 'https://radarfinanceiro.pages.dev/'
const email = `probe${Date.now()}@finai.test`
const password = 'Probe@2026x'
const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, returnSecureToken: true }),
})
const auth = await res.json()
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 900 })
await page.goto(AUTH_URL, { waitUntil: 'networkidle2', timeout: 90000 })
await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`firebase:authUser:${API_KEY}:[DEFAULT]`, JSON.stringify({ uid: auth.localId, displayName: 'Probe', email: auth.email, emailVerified: false, isAnonymous: false, providerData: [{ providerId: 'password', uid: auth.email, email: auth.email, phoneNumber: null, photoURL: null }], stsTokenManager: { refreshToken: auth.refreshToken, accessToken: auth.idToken, expirationTime: Date.now() + 3600000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()) })])
await page.reload({ waitUntil: 'networkidle2', timeout: 90000 })
await new Promise(r => setTimeout(r, 3500))
await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent.trim() === 'Lançamentos').click())
await new Promise(r => setTimeout(r, 1200))
await page.evaluate(() => {
  const setVal = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const form = document.querySelector('form')
  const inputs = [...form.querySelectorAll('input')]
  const merchant = inputs.find(i => i.type !== 'date' && i.type !== 'file' && i.type !== 'hidden')
  setVal(merchant, 'Mercado Bom')
  const value = inputs.find(i => i.inputMode === 'decimal')
  setVal(value, '50,00')
  const date = inputs.find(i => i.type === 'date')
  setVal(date, new Date().toISOString().slice(0, 10))
  const submitBtn = [...form.querySelectorAll('button')].find(b => b.textContent.trim() === 'Adicionar')
  submitBtn.click()
})
await new Promise(r => setTimeout(r, 3500))
const rep = await page.evaluate(() => {
  const formErr = document.querySelector('[role=alert]')?.textContent || ''
  const icons = [...document.querySelectorAll('[class*=merchantIcon]')].map(el => ({ text: el.textContent.trim(), bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }))
  const rows = [...document.querySelectorAll('[class*=expense]')].map(el => (el.textContent || '').trim().slice(0, 60))
  return `err=${formErr}\nrows=${JSON.stringify(rows)}\nmerchantIcons=${JSON.stringify(icons)}`
})
console.log(rep)
await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent.trim() === 'Visão geral').click())
await new Promise(r => setTimeout(r, 1500))
const greens = await page.evaluate(() => {
  const out = []
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      const bg = getComputedStyle(el).backgroundColor
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (m) {
        const [rr, gg, bb] = m.slice(1).map(Number)
        if (gg > rr && gg > bb && gg > 150) {
          out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.').slice(0, 40)} bg=${bg} "${(el.textContent || '').trim().slice(0, 24).replace(/\s+/g, ' ')}"`)
        }
      }
    }
  })
  return out.slice(0, 25)
})
console.log('--- elementos com fundo esverdeado ---')
console.log(greens.join('\n'))
await browser.close()