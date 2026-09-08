import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { AssistantPanel } from './Assistant'

const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getDoc: mocks.getDoc,
  setDoc: mocks.setDoc,
  deleteDoc: mocks.deleteDoc,
  doc: (...args) => args.join('/'),
}))

vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'u1' } },
  db: {},
}))

vi.mock('firebase/auth', () => ({
  getIdToken: vi.fn(async () => 'tok'),
}))

const answerFetch = vi.fn(async () => ({
  ok: true,
  json: async () => ({ answer: 'resposta mock', provider: 'groq' }),
}))

async function submitQuestion(text) {
  fireEvent.change(screen.getByLabelText('Mensagem para o assistente'), { target: { value: text } })
  fireEvent.click(screen.getByText('Enviar'))
}

describe('AssistantPanel — auto-save com debounce', () => {
  beforeEach(() => {
    mocks.getDoc.mockResolvedValue({ data: () => ({ messages: [{ role: 'model', text: 'histórico salvo' }] }) })
    mocks.setDoc.mockResolvedValue(undefined)
    mocks.deleteDoc.mockResolvedValue(undefined)
    vi.stubGlobal('fetch', answerFetch)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('colapsa escritas sucessivas em um único setDoc com o estado final', async () => {
    render(<AssistantPanel data={{ transactions: [], subscriptions: [] }} stats={[]} userId="u1" />)
    await screen.findByText('histórico salvo')
    mocks.setDoc.mockClear()

    await submitQuestion('pergunta 1')
    await screen.findByText('pergunta 1')
    await screen.findAllByText('resposta mock')
    await submitQuestion('pergunta 2')
    await screen.findByText('pergunta 2')

    // Aguarda o debounce (1000ms) disparar
    await new Promise((resolve) => setTimeout(resolve, 1300))

    expect(mocks.setDoc).toHaveBeenCalledTimes(1)
    const payload = mocks.setDoc.mock.calls[0][1]
    const texts = payload.messages.map((m) => m.text)
    expect(texts).toContain('pergunta 1')
    expect(texts).toContain('pergunta 2')
    expect(texts.filter((t) => t === 'resposta mock')).toHaveLength(2)
  }, 15000)

  it('descarrega (flush) alteração pendente no unmount sem perda', async () => {
    const { unmount } = render(<AssistantPanel data={{ transactions: [], subscriptions: [] }} stats={[]} userId="u1" />)
    await screen.findByText('histórico salvo')
    mocks.setDoc.mockClear()

    await submitQuestion('pergunta pendente')
    await screen.findByText('pergunta pendente')
    unmount()

    expect(mocks.setDoc).toHaveBeenCalledTimes(1)
    const payload = mocks.setDoc.mock.calls[0][1]
    expect(payload.messages.map((m) => m.text)).toContain('pergunta pendente')
  }, 15000)
})
