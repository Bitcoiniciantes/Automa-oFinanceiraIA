# FinAI Dashboard — Especificação do Projeto

## 1. Objetivo

FinAI é um dashboard financeiro web em português do Brasil. A interface apresenta saldo, receitas, despesas, fluxo financeiro, transações recentes, gastos por categoria, assinaturas e insights personalizados.

A prioridade do projeto é evoluir a integração de dados sem quebrar o layout, o comportamento visual ou a experiência responsiva existente.

## 2. Stack atual

- React com Vite.
- JavaScript/JSX, sem TypeScript.
- Firebase SDK 12.x.
- Cloud Firestore como fonte de dados.
- CSS Modules em `src/Dashboard.module.css`.
- Entrypoint: `src/main.jsx`.
- Componente principal: `src/Dashboard.jsx`.
- Configuração Firebase: `src/firebase.js`.

## 3. Estrutura atual

- `index.html`: documento HTML base.
- `src/main.jsx`: inicializa React e renderiza `Dashboard`.
- `src/Dashboard.jsx`: dados de fallback, leitura Firestore, componentes da interface e composição da página.
- `src/Dashboard.module.css`: tokens visuais, layout, componentes e breakpoints responsivos.
- `src/firebase.js`: inicialização do Firebase e exportação de `db`.
- `.env`: variáveis públicas de configuração do Firebase para o build Vite. Não versionar segredos.
- `outputs/`: entregáveis gerados, quando aplicável.
- `work/`: arquivos temporários e materiais intermediários.

## 4. Integração atual

A aplicação usa Firebase Authentication com e-mail e senha. Após o login, o dashboard usa o UID autenticado para consultar:

- documento do usuário: `usuarios/{uid}`;
- transações: `usuarios/{uid}/transacoes/{documentId}`;
- assinaturas: `usuarios/{uid}/assinaturas/{documentId}`.

O documento do usuário fornece o campo `name`. Cada documento de transação usa `merchant`, `date`, `category`, `initials`, `type` e `value`. Cada documento de assinatura usa `name`, `initials`, `type`, `nextCharge` e `value`.

Se o documento não existir ou a consulta falhar, a aplicação usa `mockData` e continua renderizando a interface. O status visível informa se os dados estão carregando, sincronizados ou em modo de demonstração.

## 5. Formato esperado do documento Firestore

Exemplo compatível com o formato atual:

```json
{
  "user": {
    "name": "João",
    "fullName": "João Silva",
    "initials": "JS"
  },
  "stats": [
    {
      "label": "Saldo atual",
      "value": "R$ 8.420,50",
      "change": "↑ 12,8%",
      "icon": "◈",
      "tone": "brand",
      "down": false
    }
  ],
  "transactions": [
    {
      "merchant": "iFood",
      "date": "Hoje, 12:42",
      "category": "Alimentação",
      "initials": "IF",
      "type": "food",
      "value": "− R$ 86,40"
    }
  ],
  "subscriptions": [
    {
      "name": "Netflix",
      "initials": "N",
      "type": "netflix",
      "nextCharge": "22 ago.",
      "value": "R$ 55,90"
    }
  ],
  "insight": "Texto do insight financeiro."
}
```

Campos ausentes usam o fallback local. Arrays remotos só substituem os arrays locais quando são realmente arrays.

## 6. Componentes existentes

- `Sidebar`: navegação lateral e chamada do plano Pro.
- `Topbar`: saudação, notificações e avatar.
- `StatCard`: cartões de saldo, receitas e despesas.
- `ChartPanel`: gráfico visual estático do fluxo financeiro.
- `TransactionList` e `TransactionItem`: transações recentes.
- `CategoryPanel`: distribuição por categoria.
- `SubscriptionRadar`: assinaturas e alerta de cobrança.
- `InsightCard`: insight e chamada para o assistente.

A navegação lateral atualmente altera o item ativo, mas não troca o conteúdo da página. Não implementar novas telas sem especificação explícita.

## 7. Regras de implementação

1. Preservar o layout, os textos, os espaçamentos, as cores e o comportamento responsivo existentes, salvo solicitação explícita.
2. Não remover o fallback local sem criar uma alternativa equivalente e validada.
3. Não substituir Firebase por Supabase ou outro backend sem decisão explícita.
4. Manter componentes pequenos e coerentes com a organização atual.
5. Usar CSS Modules para estilos novos.
6. Evitar dependências novas quando a funcionalidade puder ser implementada com a stack atual.
7. Não colocar chaves privadas, tokens ou credenciais no código ou em arquivos versionados.
8. Tratar estados de carregamento, documento inexistente e erro de rede sem tela quebrada.
9. Validar dados remotos antes de renderizar listas e objetos.
10. Manter a interface em português do Brasil.

## 8. Comandos

Instalar dependências:

```bash
npm install
```

Executar em desenvolvimento:

```bash
npm run dev
```

Gerar build de produção:

```bash
npm run build
```

Pré-visualizar o build:

```bash
npm run preview
```

## 9. Critérios de validação

Antes de concluir qualquer alteração:

- executar `npm run build`;
- verificar que não existem erros de importação ou sintaxe;
- confirmar que o fallback continua renderizando quando o Firestore não retorna documento;
- confirmar que o documento remoto pode fornecer dados parciais;
- revisar o layout em viewport desktop e mobile;
- revisar o diff para garantir que nenhuma parte funcional foi refeita sem necessidade.

## 11. Plano obrigatório para finalizar o projeto

Executar na ordem abaixo. Não considerar o projeto finalizado enquanto uma etapa obrigatória estiver pendente.

### Etapa 1 — Validar o Firestore

- Confirmar o documento `usuarios/{uid}` e as subcoleções `transacoes` e `assinaturas` para o usuário autenticado.
- Testar leitura com dados completos.
- Testar documento inexistente, dados parciais e falha de conexão.
- Confirmar que o fallback continua funcionando.

Conclusão: o dashboard carrega dados reais e mantém uma experiência utilizável em todos os cenários de leitura.

### Etapa 2 — Implementar autenticação

- Adicionar Firebase Authentication.
- Criar fluxo de entrada e saída.
- Associar o dashboard ao usuário autenticado.
- Impedir acesso ao dashboard sem sessão, conforme a decisão de produto.

Conclusão: cada usuário acessa somente a própria conta e o estado de sessão é tratado na interface.

### Etapa 3 — Definir regras de segurança

- Criar regras do Firestore por usuário.
- Bloquear leitura e escrita de dados de outros usuários.
- Validar as regras com cenários autorizados e não autorizados.
- Definir índices necessários para as consultas de produção.

Conclusão: as regras foram publicadas e testadas sem permissões excessivas.

### Etapa 4 — Substituir dados estáticos

- Alimentar o gráfico com dados reais.
- Alimentar categorias, percentuais e totais com dados reais.
- Alimentar assinaturas, alertas, datas e valores com dados reais.
- Manter valores formatados corretamente em pt-BR.

Conclusão: os dados exibidos na interface vêm do backend, sem números demonstrativos ocultos.

### Etapa 5 — Implementar as telas da navegação

- Implementar “Meus gastos”.
- Implementar “Assinaturas”.
- Implementar “Assistente IA”.
- Fazer cada item da Sidebar navegar para conteúdo funcional.

Conclusão: nenhum item principal da navegação é apenas visual ou altera somente o estado ativo.

### Etapa 6 — Implementar operações de dados

- Criar, editar e excluir transações.
- Criar, editar e remover assinaturas.
- Validar formulários e valores monetários.
- Atualizar a interface após cada operação.

Conclusão: o usuário consegue gerenciar seus dados sem editar o Firestore manualmente.

### Etapa 7 — Conectar o Assistente IA

- Definir o provedor e o modelo.
- Criar uma integração server-side segura.
- Nunca expor chaves de IA no frontend.
- Restringir o contexto às informações autorizadas do usuário.
- Tratar indisponibilidade e respostas inválidas.

Conclusão: o assistente responde com segurança usando o contexto financeiro correto.

### Etapa 8 — Adicionar testes

- Testar componentes principais.
- Testar leitura, fallback e dados parciais do Firestore.
- Testar autenticação e regras de acesso.
- Testar operações de transações e assinaturas.
- Testar viewport desktop e mobile.

Conclusão: os testes automatizados e manuais definidos para a etapa passam sem regressões.

### Etapa 9 — Preparar produção

- Configurar variáveis de ambiente de produção.
- Definir hospedagem e domínio.
- Publicar regras e índices do Firestore.
- Remover logs desnecessários.
- Configurar monitoramento de erros.
- Gerar e validar o build de produção.

Conclusão: a aplicação pode ser publicada sem credenciais expostas e sem depender do ambiente local.

### Etapa 10 — Validar acessibilidade e responsividade

- Garantir navegação por teclado.
- Adicionar labels e estados de foco aos controles.
- Corrigir contraste e leitura em telas pequenas.
- Implementar estados de loading, erro, vazio e retry.
- Verificar que todos os botões executam uma ação real ou estão explicitamente desabilitados.

Conclusão: a experiência está funcional em desktop e mobile e os principais fluxos são acessíveis.

## 12. Próximas evoluções possíveis

Estas evoluções ainda não estão implementadas e exigem decisão antes do desenvolvimento:

- autenticação de usuários;
- dados separados por usuário;
- escrita e edição de transações;
- telas reais para cada item da navegação;
- gráfico alimentado por séries temporais do Firestore;
- categorias e assinaturas vindas do backend;
- assistente de IA funcional;
- regras de segurança e índices do Firestore para produção.
