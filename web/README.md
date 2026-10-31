# LedgerFlow — Engineering & Chaos Playground

Camada visual isolada em React + Tailwind CSS, iniciada com Vite. A especificação desta entrega é o escopo visual fornecido no chat, com três telas independentes conforme a revisão solicitada. O backend existente não é alterado.

## Telas

- `#/operacoes`: carteira e formulário de pagamento.
- `#/provas`: provas BOLA/IDOR, concorrência/idempotência e payload corrompido.
- `#/telemetria`: Transactional Outbox, métricas RED e terminal.

Cada item do menu abre apenas sua tela, com título e seleção próprios. URLs podem ser abertas diretamente e a navegação acompanha o histórico do navegador. Campos e contexto de tenant permanecem no App ao navegar. Os layouts vivem em `src/pages/` e recebem props.

```sh
rtk npm install --prefix web
rtk npm run dev --prefix web
rtk npm test --prefix web
rtk npm run build --prefix web
```

Node.js 22.12+ ou 24+. O Vite informa a URL local ao iniciar. Build estático em `web/dist/`.

## Limites de responsabilidade

- `src/components/`: UI passiva, sem estado React, hooks de domínio, conversão monetária ou chamadas de rede. Dados, erros, loading e callbacks entram por props. `ui/` contém apenas primitivas visuais.
- `src/App.jsx`: composição e estado de apresentação (tenant, inputs, chave de exemplo, indicador de polling e toast com fechamento automático).
- `src/mocks/playground.js`: fixtures determinísticas. Outbox, métricas e logs representam uma sessão de exemplo; não são recalculados nem filtrados pelo tenant.
- `src/hooks/`, `src/services/`, `src/utils/`: assinaturas e retornos fixos com `TODO: [IMPLEMENTAÇÃO MANUAL]`. Não há pagamentos, validação Zod, concorrência, ataques, polling, Worker ou cálculo monetário implementados.

A regeneração seleciona sempre a mesma segunda chave de exemplo. Reset restaura os campos visuais. A ativação de polling altera apenas o indicador. Cada botão de integração informa essa condição no toast. A carteira muda entre duas fixtures ao trocar o tenant.

## Contratos para integração manual

| Superfície | Props / resultado esperado |
| --- | --- |
| HeaderTenantBar | `tenantId`, `onTenantChange(tenantId)`, `onResetSandbox()`, `isLoading`, `error` |
| WalletOverview | `walletId`, `formattedBalance: string`, `balanceInCents: number`, `isLoading`, `error` |
| PaymentForm | `amount: string`, `operation: CREDIT\|DEBIT`, `idempotencyKey`, `onAmountChange(value)`, `onOperationChange(value)`, `onRegenerateKey()`, `onSubmit()`, `isLoading`, `error` |
| ChaosSimulator | `bolaResult`, `raceStatuses: number[]`, `payloadResult`, `onBolaAttack()`, `onRaceTest()`, `onCorruptPayload()`, `isLoading`, `activeAction`, `error` |
| OutboxMonitor | `events: {eventId,type,status,attempts}[]`, `isPolling`, `isLoading`, `isProcessing`, `error`, `onTogglePolling()`, `onProcessWorker()` |
| TelemetryTerminal | `metrics: {totalRequests,errorRate,averageDuration}`, `logs: {id,time,method,path,status,duration,correlationId,body}[]`, `isLoading`, `error` |
| apiRequest(options) | `options: {path,method?,tenantId,body?,signal?}` → Promise de `{data,status,correlationId,error}` |

Erro normalizado: `{ status: number, message: string, fields?: { amount?: string, idempotencyKey?: string } }`. Props `body` dos logs devem ser valores JSON serializáveis. A interface renderiza JSON escapado; a sanitização de conteúdo sensível continua sendo responsabilidade da integração e do servidor.

`VITE_API_BASE_URL` está reservado em `.env.example`, sem valor e sem utilização no mock. Não há segredo no frontend. Os caminhos exibidos no terminal são ilustrativos, não um contrato de endpoints do backend.

## Verificação

`rtk npm test --prefix web -- tests/components.ui.jsx` é o teste focal dos componentes; `rtk npm test --prefix web` cobre também a composição. Os testes exercitam callbacks, controles passivos, semântica HTTP, loading/vazio, escape de JSON, troca de tenant e reset visual. O sufixo `.ui.jsx` mantém a suíte visual fora da descoberta padrão do Vitest do backend.

Os testes do backend mantêm seu executor na raiz. Não é necessário banco ou API para testar este frontend. Configuração do build conforme [Vite](https://vite.dev/guide/) e [Tailwind CSS](https://tailwindcss.com/docs/installation/using-vite).
