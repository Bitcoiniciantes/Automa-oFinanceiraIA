import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MonthlyReport } from './Report.jsx'

const user = { fullName: 'João Silva' }
const transactions = [
  { id: '1', merchant: 'Mercado Bom', value: '− R$ 250,00', date: '2026-08-03', category: 'Alimentação', amount: 250 },
  { id: '2', merchant: 'Uber', value: '− R$ 35,00', date: '2026-08-10', category: 'Transporte', amount: 35 },
  { id: '3', merchant: 'Salário', value: 'R$ 5.000,00', date: '2026-08-05', category: 'Salário', amount: 5000, type: 'receita' },
  { id: '4', merchant: 'Mercado Bom', value: '− R$ 90,00', date: '2026-07-28', category: 'Alimentação', amount: 90 },
]

const rowCount = () => screen.getAllByRole('row').length

describe('MonthlyReport', () => {
  beforeEach(() => {
    window.print = vi.fn()
  })

  afterEach(() => {
    cleanup()
  })

  it('renderiza resumo do mês atual (agosto) com receitas, despesas e saldo', () => {
    render(<MonthlyReport transactions={transactions} user={user} />)
    expect(screen.getByText('Relatório mensal')).toBeTruthy()
    expect(screen.getAllByText('R$ 5.000,00').length).toBeGreaterThan(0)
    expect(screen.getByText('R$ 285,00')).toBeTruthy()
    expect(screen.getAllByText('R$ 4.715,00').length).toBeGreaterThan(0)
  })

  it('mostra categorias de despesa com percentuais', () => {
    render(<MonthlyReport transactions={transactions} user={user} />)
    expect(screen.getAllByText('Alimentação').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Transporte').length).toBeGreaterThan(0)
  })

  it('lista apenas os lançamentos do mês selecionado', () => {
    render(<MonthlyReport transactions={transactions} user={user} />)
    expect(screen.getByText('Uber')).toBeTruthy()
    expect(rowCount()).toBe(4)
  })

  it('navega para o mês anterior e atualiza a lista', () => {
    render(<MonthlyReport transactions={transactions} user={user} />)
    fireEvent.click(screen.getByLabelText('Mês anterior'))
    expect(screen.getAllByText(/julho de 2026/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('R$ 90,00').length).toBeGreaterThan(0)
    expect(rowCount()).toBe(2)
  })

  it('chama window.print ao clicar em Baixar PDF', () => {
    render(<MonthlyReport transactions={transactions} user={user} />)
    fireEvent.click(screen.getByText('Baixar PDF'))
    expect(window.print).toHaveBeenCalledTimes(1)
  })
})