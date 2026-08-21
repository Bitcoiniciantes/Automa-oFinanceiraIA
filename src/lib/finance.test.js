import { describe, expect, it } from 'vitest'
import { formatBRL, inferCategory, parseAmount, parseMoneyInput, buildStats, buildChartSeries, isExpense, findDuplicate } from './finance'

describe('formatBRL', () => {
  it('formata números em reais', () => {
    expect(formatBRL(1234.5)).toBe('R$ 1.234,50')
    expect(formatBRL(0)).toBe('R$ 0,00')
    expect(formatBRL(-86.4)).toBe('R$ 86,40')
  })
})

describe('inferCategory', () => {
  it('mapeia estabelecimento para categoria', () => {
    expect(inferCategory('Mercado Bom')).toBe('Alimentação')
    expect(inferCategory('Aluguel')).toBe('Moradia')
    expect(inferCategory('Condomínio')).toBe('Moradia')
    expect(inferCategory('Uber')).toBe('Transporte')
    expect(inferCategory('Farmácia')).toBe('Saúde')
    expect(inferCategory('Curso de inglês')).toBe('Educação')
    expect(inferCategory('XYZ Desconhecido')).toBe(null)
    expect(inferCategory('')).toBe(null)
  })
})

describe('parseMoneyInput', () => {
  it('converte entrada monetária brasileira', () => {
    expect(parseMoneyInput('1.234,56')).toBe(1234.56)
    expect(parseMoneyInput('R$ 50,00')).toBe(50)
    expect(parseMoneyInput('')).toBeNaN()
  })
})

describe('parseAmount', () => {
  it('lê amount numérico direto', () => {
    expect(parseAmount({ amount: 86.4 })).toBe(86.4)
  })
  it('lê valor textual com sinal', () => {
    expect(parseAmount({ value: '− R$ 86,40' })).toBe(-86.4)
    expect(parseAmount({ value: 'R$ 50,00' })).toBe(50)
  })
})

describe('isExpense', () => {
  it('detecta gasto pelo sinal', () => {
    expect(isExpense({ value: '− R$ 10,00' })).toBe(true)
    expect(isExpense({ value: '-R$ 10,00' })).toBe(true)
    expect(isExpense({ value: 'R$ 10,00' })).toBe(false)
  })
})

describe('findDuplicate', () => {
  const list = [{ id: 'a', merchant: 'Mercado', date: '18/08/2026', value: '− R$ 50,00' }]
  it('retorna duplicata exata', () => {
    expect(findDuplicate(list, { id: 'b', merchant: 'Mercado', date: '18/08/2026', amount: 50 })).toEqual(list[0])
  })
  it('ignora valores diferentes', () => {
    expect(findDuplicate(list, { id: 'b', merchant: 'Mercado', date: '18/08/2026', amount: 99 })).toBeUndefined()
  })
})

describe('buildStats', () => {
  it('zera quando não há transações', () => {
    const stats = buildStats([])
    expect(stats).toHaveLength(3)
    expect(stats[0].value).toBe('R$ 0,00')
    expect(stats[1].value).toBe('R$ 0,00')
    expect(stats[2].value).toBe('R$ 0,00')
  })
  it('soma despesas e receitas do mês atual', () => {
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const stats = buildStats([
      { value: '− R$ 40,00', date: iso },
      { value: 'R$ 100,00', date: iso },
    ])
    expect(stats[1].value).toBe('R$ 100,00')
    expect(stats[2].value).toBe('R$ 40,00')
    expect(stats[0].value).toBe('R$ 60,00')
  })
})

describe('buildChartSeries', () => {
  it('gera 12 pontos por padrão', () => {
    expect(buildChartSeries([])).toHaveLength(12)
  })
  it('gera 6 pontos quando solicitado', () => {
    expect(buildChartSeries([], 6)).toHaveLength(6)
  })
})
