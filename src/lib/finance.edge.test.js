import { describe, expect, it } from 'vitest'
import {
  buildCategories,
  buildStats,
  findDuplicate,
  formatBRL,
  parseAmount,
  parseMoneyInput,
  parseTransactionDate,
} from './finance'

describe('parseAmount — casos limite', () => {
  it('retorna 0 para valor ausente ou inválido', () => {
    expect(parseAmount({})).toBe(0)
    expect(parseAmount({ value: '' })).toBe(0)
    expect(parseAmount({ value: 'sem número' })).toBe(0)
  })
  it('lê zero explicitamente', () => {
    expect(parseAmount({ amount: 0 })).toBe(0)
    expect(parseAmount({ value: 'R$ 0,00' })).toBe(0)
  })
  it('lê valores grandes no formato brasileiro', () => {
    expect(parseAmount({ value: '− R$ 1.234.567,89' })).toBe(-1234567.89)
    expect(parseAmount({ value: 'R$ 1.234.567,89' })).toBe(1234567.89)
  })
  it('lê hífen ASCII como despesa', () => {
    expect(parseAmount({ value: '-R$ 10,00' })).toBe(-10)
  })
  it('ignora amount não-numérico e usa value', () => {
    expect(parseAmount({ amount: NaN, value: 'R$ 7,50' })).toBe(7.5)
    expect(parseAmount({ amount: Infinity, value: 'R$ 7,50' })).toBe(7.5)
  })
})

describe('parseMoneyInput — casos limite', () => {
  it('retorna NaN para nulo/indefinido', () => {
    expect(parseMoneyInput(null)).toBeNaN()
    expect(parseMoneyInput(undefined)).toBeNaN()
  })
  it('lê zero e negativos', () => {
    expect(parseMoneyInput('0')).toBe(0)
    expect(parseMoneyInput('-50,00')).toBe(-50)
  })
  it('retorna NaN para texto sem número', () => {
    expect(parseMoneyInput('abc')).toBeNaN()
  })
})

describe('parseTransactionDate — casos limite', () => {
  it('usa fallback quando a data é vazia ou inválida', () => {
    const fallback = new Date('2026-01-02T12:00:00')
    expect(parseTransactionDate('', fallback)).toBe(fallback)
    expect(parseTransactionDate('data maluca', fallback)).toBe(fallback)
    expect(parseTransactionDate(null, fallback)).toBe(fallback)
  })
  it('lê DD/MM/AAAA e ISO', () => {
    expect(parseTransactionDate('18/08/2026')).toEqual(new Date(2026, 7, 18))
    expect(parseTransactionDate('2026-08-03')).toEqual(new Date(2026, 7, 3))
  })
  it('lê "hoje" e "ontem"', () => {
    const today = new Date()
    expect(parseTransactionDate('hoje').toDateString()).toBe(today.toDateString())
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(parseTransactionDate('ontem').toDateString()).toBe(yesterday.toDateString())
  })
})

describe('findDuplicate — tolerância', () => {
  const list = [{ id: 'a', merchant: 'Mercado', date: '18/08/2026', value: '− R$ 50,00' }]
  it('aceita diferença de centavo dentro da tolerância', () => {
    expect(findDuplicate(list, { id: 'b', merchant: 'mercado', date: '18/08/2026', amount: 50.005 })).toEqual(list[0])
  })
  it('rejeita diferença acima da tolerância', () => {
    expect(findDuplicate(list, { id: 'b', merchant: 'Mercado', date: '18/08/2026', amount: 50.02 })).toBeUndefined()
  })
  it('ignora o próprio id', () => {
    expect(findDuplicate(list, { id: 'a', merchant: 'Mercado', date: '18/08/2026', amount: 50 })).toBeUndefined()
  })
  it('não quebra com merchant ausente no candidato', () => {
    expect(findDuplicate(list, { id: 'b', date: '18/08/2026', amount: 50 })).toBeUndefined()
  })
  it('rejeita data diferente', () => {
    expect(findDuplicate(list, { id: 'b', merchant: 'Mercado', date: '19/08/2026', amount: 50 })).toBeUndefined()
  })
})

describe('buildStats — saldo negativo e sem histórico', () => {
  it('exibe traço quando não há mês anterior', () => {
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-10`
    const stats = buildStats([{ value: '− R$ 40,00', date: iso }])
    expect(stats[0].change).toBe('—')
  })
  it('calcula saldo negativo corretamente', () => {
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-10`
    const stats = buildStats([{ value: '− R$ 100,00', date: iso }])
    expect(stats[0].value).toBe(formatBRL(-100))
  })
})

describe('buildCategories — agrupamento', () => {
  it('retorna vazio sem despesas', () => {
    expect(buildCategories([], 'all')).toEqual({ list: [], total: 0 })
    expect(buildCategories([{ value: 'R$ 10,00', date: '2026-08-01' }], 'all')).toEqual({ list: [], total: 0 })
  })
  it('agrupa por categoria e ordena por valor', () => {
    const result = buildCategories(
      [
        { value: '− R$ 10,00', date: '2026-08-01', category: 'Transporte' },
        { value: '− R$ 30,00', date: '2026-08-02', category: 'Alimentação' },
        { value: '− R$ 20,00', date: '2026-08-03', category: 'Alimentação' },
      ],
      'all'
    )
    expect(result.total).toBe(60)
    expect(result.list[0]).toMatchObject({ label: 'Alimentação', value: 50 })
    expect(result.list[1]).toMatchObject({ label: 'Transporte', value: 10 })
  })
})
