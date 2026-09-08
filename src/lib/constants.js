// Fonte única de verdade para nomes persistidos e endpoints externos.
// NÃO alterar os valores sem migração: eles fazem parte do schema Firestore
// e dos contratos com o Worker Cloudflare.

export const USER_COLLECTION = 'usuarios'
export const TRANSACTIONS_SUBCOLLECTION = 'transacoes'
export const SUBSCRIPTIONS_SUBCOLLECTION = 'assinaturas'
export const ASSISTANT_SUBCOLLECTION = 'assistente'
export const ASSISTANT_DOC_ID = 'conversa'

const DEFAULT_FINAI_API_BASE_URL = 'https://bitcoiniciantes-ia.bitcoiniciantes.workers.dev'

function readEnv(name) {
  try {
    return import.meta.env?.[name]
  } catch {
    return undefined
  }
}

export const FINAI_API_BASE_URL = (readEnv('VITE_FINAI_API_BASE_URL') || DEFAULT_FINAI_API_BASE_URL).replace(/\/+$/, '')
export const FINAI_ASSISTANT_ENDPOINT = `${FINAI_API_BASE_URL}/v1/finai-assistant`
export const FINAI_INVOICE_ENDPOINT = `${FINAI_API_BASE_URL}/v1/finai-invoice`

// Alias legado: o endpoint do assistente já era referenciado como FINAI_AI_ENDPOINT.
export const FINAI_AI_ENDPOINT = FINAI_ASSISTANT_ENDPOINT
