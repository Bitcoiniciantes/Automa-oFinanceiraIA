import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../lib/markdown'

describe('renderMarkdown — segurança (XSS)', () => {
  it('escapa scripts inline', () => {
    const out = renderMarkdown('<script>alert(1)</script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
  })

  it('escapa img com onerror', () => {
    const out = renderMarkdown('<img src=x onerror=alert(1)>')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;img')
  })

  it('escapa svg com onload', () => {
    const out = renderMarkdown('<svg onload=alert(1)>')
    expect(out).not.toContain('<svg')
    expect(out).toContain('&lt;svg')
  })

  it('desativa link javascript: (não produz tag <a> executável)', () => {
    const out = renderMarkdown('<a href="javascript:alert(1)">x</a>')
    expect(out).not.toContain('<a ')
    expect(out).not.toContain('<a>')
    expect(out).toContain('&lt;a')
    expect(out).toContain('&gt;')
  })

  it('escapa attribute injection via aspas', () => {
    const out = renderMarkdown('"><img src=x onerror=alert(1)>')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;img')
  })

  it('escapa iframe', () => {
    const out = renderMarkdown('<iframe src="https://evil.com"></iframe>')
    expect(out).not.toContain('<iframe')
    expect(out).toContain('&lt;iframe')
  })

  it('preserva texto simples', () => {
    const out = renderMarkdown('Olá, seu saldo é R$ 1.000,00')
    expect(out).toContain('Olá, seu saldo é R$ 1.000,00')
  })

  it('preserva negrito markdown', () => {
    const out = renderMarkdown('**negrito**')
    expect(out).toContain('<b>negrito</b>')
  })

  it('preserva código inline', () => {
    const out = renderMarkdown('` código `')
    expect(out).toContain('<code> código </code>')
  })

  it('preserva listas', () => {
    const out = renderMarkdown('- item 1\n- item 2')
    expect(out).toContain('<ul>')
    expect(out).toContain('<li>item 1</li>')
    expect(out).toContain('<li>item 2</li>')
  })

  it('preserva cabeçalhos', () => {
    const out = renderMarkdown('## Título')
    expect(out).toContain('<b>Título</b>')
  })

  it('retorna vazio para null/undefined', () => {
    expect(renderMarkdown(null)).toBe('')
    expect(renderMarkdown(undefined)).toBe('')
    expect(renderMarkdown('')).toBe('')
  })
})
