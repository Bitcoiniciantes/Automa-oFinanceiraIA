# Instruções para a IA responsável pelo projeto FinAI

## Contexto obrigatório

Leia `PROJECT_SPEC.md` antes de alterar o projeto. O projeto está em `C:\Users\joelh\Site Bitcoiniciantes\AutomaçaoFinanceriaIA\2026-08-17\2026-08-17\va`.

## Procedimento de trabalho

1. Inspecione os arquivos existentes antes de editar.
2. Identifique o estado atual da integração e os componentes já funcionais.
3. Não refaça partes funcionais apenas por preferência arquitetural.
4. Faça a menor alteração que atenda ao objetivo solicitado.
5. Preserve layout, responsividade, textos e comportamento existentes.
6. Para dados financeiros, valide o formato antes de renderizar.
7. Mantenha Firebase/Firestore como backend atual, salvo instrução explícita em contrário.
8. Nunca exponha o conteúdo integral do `.env` em respostas, logs ou artefatos.
9. Depois da alteração, execute `npm run lint`, `npm test` e `npm run build`, corrigindo todos os erros.
10. Revise os arquivos modificados e informe exatamente o que mudou e quais validações passaram.

## Arquitetura atual

- SPA React + Vite (`vite.config.js`), com `react-router-dom` em modo `HashRouter` (rotas `#/`, `#/lancamentos`, `#/assinaturas`, `#/assistente`).
- Auth: Firebase Authentication (e-mail/senha) via `src/firebase.js`, com App Check (ReCaptchaV3). Login/landing em `src/AuthGate.jsx`; painel em `src/Dashboard.jsx` (shell) com componentes em `src/components/` e helpers puros testados em `src/lib/finance.js` (+ `finance.test.js`).
- Dados por usuário no Firestore:

```
usuarios/{uid}                          (doc pai pode ser virtual — só subcoleções existem)
├── transacoes/{id}        # gasto ou receita; { merchant, value, date, category, type, ... }
├── assinaturas/{id}       # { name, initials, type, chargeDate, nextCharge, value, amount }
└── assistente/conversa    # { messages: [...] }
```

- `src/Dashboard.module.css` usa CSS Modules; em produção os nomes de classe são hasheados (não usar seletores de classe em probes).
- Worker Cloudflare (`bitcoiniciantes-ia.bitcoiniciantes.workers.dev`) faz a leitura de notas e o Assistente IA; endpoints usados em `src/components/Transactions.jsx` e `src/components/Assistant.jsx`.

## Deploy

- Branch `agent/supabase-invoice-upload` == `main`. Push em `main` dispara GitHub Actions (GitHub Pages).
- O `base` do Vite vem de `VITE_BASE_PATH` (`vite.config.js`, default `/`):
  GitHub Pages usa `/Automa-oFinanceiraIA/` (definido no workflow `deploy.yml`);
  Cloudflare Pages e Firebase Hosting usam `/` (raiz). Não fixar `base` no código.
- Build local usa base `/`; para o Cloudflare/Firebase não é preciso flag extra.
- Verificar deploy lendo o hash `assets/index-*.js` no HTML publicado (latência do Cloudflare pode passar de 100 s).

## Configuração centralizada (`src/lib/constants.js`)

- Nomes persistidos no Firestore (`USER_COLLECTION = 'usuarios'`, subcoleções)
  e endpoints do Worker (`FINAI_ASSISTANT_ENDPOINT`, `FINAI_INVOICE_ENDPOINT`)
  têm fonte única em `src/lib/constants.js`. Não duplicar literais nos componentes.
- `VITE_FINAI_API_BASE_URL` permite trocar a base da API; sem ela, usa produção.
- Nunca alterar os valores persistidos sem migração.

## Segurança e persistência

- `renderMarkdown` vive em `src/lib/markdown.js`: escapa `&<>` antes de inserir
  tags próprias; sem links/atributos → sem vetor XSS (travado por testes em
  `src/components/Assistant.test.jsx`). Não reintroduzir HTML arbitrário.
- `firestore.rules`: sem a regra pública morta `/dashboards`; `assistente` tem
  regra explícita por UID (igual ao wildcard). Não ampliar permissões.
- Auto-save do Assistant tem debounce de 1 s com flush no unmount
  (`Assistant.autosave.test.jsx`). Não voltar a salvar a cada `setState`.
- `findDuplicate` tolera `merchant` ausente (retorna sem match, sem throw).

## Convenções deliberadas (não "corrigir")

- CSS em um único `Dashboard.module.css`; `:global()` só para tokens/reset.
- API pública em inglês, variáveis internas de domínio em português (`finance.js`).
- Componentes `export function`; `Icons.jsx` usa arrow (ok pelo lint).
- `handle*` só no BulkImport; demais usam verbos — ambos aceitos.
- `console.warn` = recuperável, `console.error` = falha real.
- App Check só fora de `DEV` e com key presente (dev local sem App Check é intencional).

## Restrições

- Não trocar o backend sem autorização explícita.
- Não alterar tokens visuais globais sem necessidade.
- Não criar credenciais fictícias.
- Não declarar uma integração como concluída sem validar lint, testes e build.
- Se faltar informação de negócio ou esquema do Firestore, registre a incerteza e implemente somente comportamento compatível com o esquema existente.

## Formato da entrega

A resposta final deve conter apenas:

- resumo objetivo das alterações;
- arquivos modificados;
- comandos de validação executados e resultado;
- bloqueios reais, se existirem.