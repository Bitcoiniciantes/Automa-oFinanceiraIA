# FinAI — Dashboard Financeiro

Dashboard financeiro web em português do Brasil: saldo, receitas, despesas, fluxo, transações, categorias, assinaturas e um assistente de IA conversacional.

## Stack

- React 19 + Vite 8 (JavaScript/JSX, CSS Modules)
- React Router (`HashRouter` — rotas `#/`, `#/lancamentos`, `#/assinaturas`, `#/assistente`)
- Firebase Authentication (e-mail/senha) + App Check + Cloud Firestore
- Helpers de domínio puros em `src/lib/finance.js` (testados com Vitest)
- ESLint + Prettier

## Estrutura

```
src/
├── main.jsx              # entrypoint (HashRouter + AuthGate)
├── AuthGate.jsx          # landing + login/cadastro
├── Dashboard.jsx         # shell do painel (fetch, estado, layout)
├── Dashboard.module.css  # CSS Modules (tokens, layout, responsivo)
├── firebase.js           # inicialização Firebase + App Check
├── components/           # Navigation, OverviewPanels, Transactions,
│                         # Subscriptions, Assistant, Icons, navItems
└── lib/
    ├── finance.js        # helpers puros (parse, format, inferCategory, stats…)
    └── finance.test.js   # testes unitários
```

## Firestore

```
usuarios/{uid}                          (doc pai pode ser virtual)
├── transacoes/{id}        # { merchant, value, date, category, type, ... }
├── assinaturas/{id}       # { name, initials, type, chargeDate, nextCharge, value, amount }
└── assistente/conversa    # { messages: [...] }
```

## Comandos

```bash
npm install        # instala dependências
npm run dev        # servidor de desenvolvimento
npm test           # testes (Vitest)
npm run lint       # ESLint (zero warnings)
npm run build      # build de produção
```

## Deploy

- Push em `main` → GitHub Actions (base `/Automa-oFinanceiraIA/`) + Cloudflare Pages (base `/`).
- Para o Cloudflare o build usa `npm run build -- --base=/`.
- Configuração do Firebase fica em `.env` (não versionado); use `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`.