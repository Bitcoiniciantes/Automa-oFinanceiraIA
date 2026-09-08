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

Existem três alvos suportados, todos servindo o build de `dist/` como SPA
(`HashRouter` — refresh e navegação funcionam em qualquer base):

- **GitHub Pages** (CI em `.github/workflows/deploy.yml`): build com
  `VITE_BASE_PATH=/Automa-oFinanceiraIA/` (subpath do repositório).
- **Firebase Hosting** (`firebase.json`, `firebase deploy` manual): build com
  a base padrão `/` (raiz).
- **Cloudflare Pages** (manual): build com a base padrão `/` (raiz).

O `base` do Vite vem da variável `VITE_BASE_PATH` (`vite.config.js`);
quando ausente, o default é `/`. O workflow do GitHub Actions define o
subpath automaticamente — não fixe um `base` global no código.

## Variáveis de ambiente

Configuração do Firebase fica em `.env` (não versionado, ver `.env.example`):
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
`VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APPCHECK_SITE_KEY`
(só ativado fora de `DEV`, quando a key existe).

Opcionais (`VITE_BASE_PATH`, `VITE_FINAI_API_BASE_URL`) têm fallback seguro
para os valores de produção — documentadas em `.env.example`.

## Testes

```bash
npm test   # Vitest: finance, markdown/XSS, Report, auto-save, constants
```