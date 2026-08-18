# Instruções para a IA responsável pelo projeto FinAI

## Contexto obrigatório

Leia `PROJECT_SPEC.md` antes de alterar o projeto. O projeto está em `C:\Users\joelh\Documents\Codex\2026-08-17\va`.

## Procedimento de trabalho

1. Inspecione os arquivos existentes antes de editar.
2. Identifique o estado atual da integração e os componentes já funcionais.
3. Não refaça partes funcionais apenas por preferência arquitetural.
4. Faça a menor alteração que atenda ao objetivo solicitado.
5. Preserve layout, responsividade, textos e comportamento existentes.
6. Para dados financeiros, valide o formato antes de renderizar.
7. Mantenha Firebase/Firestore como backend atual, salvo instrução explícita em contrário.
8. Use o fallback local sempre que a fonte remota estiver indisponível ou incompleta.
9. Nunca exponha o conteúdo integral do `.env` em respostas, logs ou artefatos.
10. Depois da alteração, execute `npm run build` e corrija todos os erros encontrados.
11. Revise os arquivos modificados e informe exatamente o que mudou e quais validações passaram.

## Escopo do backend atual

A leitura padrão é o documento Firestore `dashboards/default`. As variáveis Vite podem alterar coleção e documento:

- `VITE_FIREBASE_DASHBOARD_COLLECTION`;
- `VITE_FIREBASE_DASHBOARD_DOCUMENT`.

O formato de dados e o comportamento de fallback estão descritos em `PROJECT_SPEC.md`.

## Restrições

- Não trocar o backend sem autorização explícita.
- Não apagar `mockData` enquanto a integração remota não estiver comprovadamente completa.
- Não alterar tokens visuais globais sem necessidade.
- Não criar credenciais fictícias.
- Não declarar uma integração como concluída sem validar o build.
- Se faltar informação de negócio ou esquema do Firestore, registre a incerteza e implemente somente comportamento compatível com o esquema existente.

## Formato da entrega

A resposta final deve conter apenas:

- resumo objetivo das alterações;
- arquivos modificados;
- comandos de validação executados e resultado;
- bloqueios reais, se existirem.


## Plano obrigatório de execução

Siga esta ordem para finalizar o projeto. Não marque o projeto como concluído se alguma etapa estiver pendente:

1. Validar o Firestore: confirmar `dashboards/default`, testar dados completos, parciais, documento inexistente, falha de conexão e fallback.
2. Implementar autenticação: Firebase Authentication, entrada, saída, sessão e associação dos dados ao usuário.
3. Definir regras de segurança: acesso por usuário, cenários autorizados/não autorizados e índices de produção.
4. Substituir dados estáticos: gráfico, categorias, totais, assinaturas, alertas, datas e valores devem vir do backend.
5. Implementar as telas da navegação: “Meus gastos”, “Assinaturas” e “Assistente IA” devem ser funcionais.
6. Implementar operações de dados: criar, editar e excluir transações; gerenciar assinaturas; validar formulários.
7. Conectar o Assistente IA: integração server-side, chaves protegidas, contexto por usuário e tratamento de falhas.
8. Adicionar testes: componentes, Firestore, fallback, autenticação, permissões, operações e responsividade.
9. Preparar produção: ambiente, hospedagem, domínio, regras, índices, monitoramento e build.
10. Validar acessibilidade e responsividade: teclado, foco, labels, contraste, loading, erro, vazio, retry e ações reais nos botões.

Os critérios detalhados de conclusão de cada etapa estão em `PROJECT_SPEC.md`, na seção “Plano obrigatório para finalizar o projeto”.
