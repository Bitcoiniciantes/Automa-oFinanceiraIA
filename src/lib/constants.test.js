import { describe, expect, it } from 'vitest'
import {
  ASSISTANT_DOC_ID,
  ASSISTANT_SUBCOLLECTION,
  FINAI_AI_ENDPOINT,
  FINAI_API_BASE_URL,
  FINAI_ASSISTANT_ENDPOINT,
  FINAI_INVOICE_ENDPOINT,
  SUBSCRIPTIONS_SUBCOLLECTION,
  TRANSACTIONS_SUBCOLLECTION,
  USER_COLLECTION,
} from './constants'

describe('constants — fonte única de verdade', () => {
  it('preserva os nomes persistidos no Firestore', () => {
    expect(USER_COLLECTION).toBe('usuarios')
    expect(TRANSACTIONS_SUBCOLLECTION).toBe('transacoes')
    expect(SUBSCRIPTIONS_SUBCOLLECTION).toBe('assinaturas')
    expect(ASSISTANT_SUBCOLLECTION).toBe('assistente')
    expect(ASSISTANT_DOC_ID).toBe('conversa')
  })

  it('compõe endpoints a partir da base sem derivação frágil', () => {
    expect(FINAI_ASSISTANT_ENDPOINT).toBe(`${FINAI_API_BASE_URL}/v1/finai-assistant`)
    expect(FINAI_INVOICE_ENDPOINT).toBe(`${FINAI_API_BASE_URL}/v1/finai-invoice`)
    expect(FINAI_AI_ENDPOINT).toBe(FINAI_ASSISTANT_ENDPOINT)
  })

  it('usa o endpoint público de produção como padrão', () => {
    expect(FINAI_API_BASE_URL).toBe('https://bitcoiniciantes-ia.bitcoiniciantes.workers.dev')
  })
})
