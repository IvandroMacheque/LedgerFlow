# 🛡️ LedgerFlow — Distributed Financial Ledger & Engineering Playground

<div align="left">
  <img src="https://img.shields.io/badge/Architecture-Clean_%26_SOLID-0F172A?style=for-the-badge" alt="Clean Architecture" />
  <img src="https://img.shields.io/badge/Mutation_Score-86.4%25_(Stryker)-10B981?style=for-the-badge" alt="Mutation Score" />
  <img src="https://img.shields.io/badge/Security-Anti--BOLA_%26_Zod-EF4444?style=for-the-badge" alt="Security" />
  <img src="https://img.shields.io/badge/Messaging-Transactional_Outbox-3B82F6?style=for-the-badge" alt="Outbox" />
  <img src="https://img.shields.io/badge/Observability-AsyncLocalStorage_%26_RED-8B5CF6?style=for-the-badge" alt="Observability" />
</div>

<br />

> **Motor transacional de pagamentos Multi-Tenant e plataforma interativa de simulação de caos**, construído sob rigor de **Prática Deliberada de Engenharia (Deliberate Practice)** para demonstrar garantias ACID sob concorrência real, isolamento estrito contra vulnerabilidades de autorização (BOLA / IDOR), observabilidade assíncrona ponta a ponta e entrega distribuída confiável com Transactional Outbox.

> [!IMPORTANT]
> ### 📌 Status Executivo do Projeto
> - **Backend Core, Segurança BOLA, Observabilidade & Transactional Outbox (Fases 1 a 6):** 100% Concluído e Verificado (86.4% Mutation Score).
> - **Frontend Core Logic & UI (Fase 7 - Moeda, Idempotency Manager, API Client, Chaos Runner e Telas):** 100% Concluído e Testado via TDD.
> - **Próximo Passo (Em Progresso):** Integração HTTP E2E (Composition Root / Server Bootstrap) conectando a camada visual `web/` diretamente às rotas em tempo real do `server/`.

---

## 🎯 O Propósito Estratégico por Trás deste Projeto

Na evolução da carreira em Engenharia de Software, existe uma fronteira clara entre construir **aplicações que apenas funcionam no caminho feliz** e arquitetar **sistemas resilientes preparados para falhas reais de produção**.

O **LedgerFlow** não é mais um CRUD financeiro genérico. Ele foi concebido e executado como um **Roadmap de Prática Deliberada em 7 Fases**, saindo dos primeiros princípios matemáticos de domínio até decisões avançadas de sistemas distribuídos e governança de software:

1. **Garantias Matemáticas sobre Ponto Flutuante:** Erradicação de erros IEEE 754 através de Value Objects imutáveis operando exclusivamente em inteiros (centavos), transações atômicas e bloqueio pessimista (`SELECT ... FOR UPDATE`) no PostgreSQL.
2. **Qualidade Verificada por Testes de Mutação:** Superação da métrica ilusória de cobertura de linhas (*code coverage*). O domínio e a infraestrutura foram submetidos ao **Stryker Mutator**, atingindo **86.4% de Mutation Score** na eliminação de mutantes lógicos.
3. **Segurança Defensiva na Camada de Dados (Zero-Trust):** Prevenção de falhas críticas como **BOLA / IDOR** (Broken Object Level Authorization) no nível do banco via chave composta `(id, tenant_id)`, sanitização total de erros contra vazamento de metadados e validação estrita com Zod.
4. **Telemetria Assíncrona e Diagnóstico de Incidentes:** Rastreamento ponta a ponta sem poluição de assinaturas via `AsyncLocalStorage` (Node.js), propagação invisível de `correlationId`, métricas RED (*Rate, Errors, Duration*) e documentação de *Post-Mortem*.
5. **Consistência Eventual e Resiliência em Sistemas Distribuídos:** Eliminação do problema da escrita dupla (*Dual-Write Problem*) com o padrão **Transactional Outbox**, workers assíncronos com `FOR UPDATE SKIP LOCKED`, despacho com *Exponential Backoff + Full Jitter* e consumidor idempotente.
6. **Governança Técnica e Spec-Driven Development (SDD):** Decisões documentadas em Architecture Decision Records (*ADRs*), análise de execução com `EXPLAIN ANALYZE` e especificações formais de cada fase.
7. **Engineering & Chaos Playground Visual:** Painel interativo em React + Tailwind para provar e auditar visualmente a quebra e a contenção de falhas (ataques BOLA ao vivo, rajadas de concorrência com rejeição idempotente e rastreamento de telemetria).

---

## 🏗️ Arquitetura do Repositório

O projeto é estruturado em módulos com separação estrita entre motor financeiro, camada visual de auditoria e governança técnica:

```text
ledgerflow/
├── docs/                         # Governança: Especificações (SDD), ADRs e Post-Mortems
│   ├── adr/                      # Architecture Decision Records (Trade-offs e CAP)
│   │   └── adr-001-transactional-outbox-and-modular-monolith.md
│   ├── database/                 # Análise de queries e planos de execução (EXPLAIN ANALYZE)
│   │   └── explain-analyze-ledger.md
│   ├── post-mortems/             # Diagnóstico de incidentes reais/simulados com causa-raiz
│   │   └── incidente-01-post-mortem.md
│   └── specs/                    # Contratos e invariantes técnicas (Fases 1 a 7)
├── server/                       # Backend: Clean Architecture, DDD, Resiliência e Concorrência
│   ├── docker-compose.yml        # PostgreSQL com migrações automáticas e healthcheck
│   ├── stryker.config.json       # Configuração da suíte de mutação (Vitest Runner)
│   ├── src/
│   │   ├── domain/               # Entidades (Wallet), Value Objects (Money), Invariantes e Erros
│   │   ├── application/          # Casos de Uso (ProcessPaymentUseCase, RefundPaymentUseCase)
│   │   ├── infra/
│   │   │   ├── db/               # Pool pg, migrations SQL (wallets, ledger, outbox_events)
│   │   │   ├── repositories/     # PostgresWalletRepository, PostgresOutboxRepository
│   │   │   ├── observability/    # AsyncLocalStorage context, Logger JSON estruturado, RED Metrics
│   │   │   ├── resilience/       # retryWithJitter (Exponential Backoff + Full Jitter)
│   │   │   └── workers/          # OutboxWorker (SKIP LOCKED) e IdempotentWebhookConsumer
│   │   └── presentation/         # Controllers, Zod Schemas, TenantContext e ErrorHandler
│   └── tests/                    # Suítes Unitárias, Concorrência, ACID, BOLA e Incidentes
└── web/                          # Frontend: Engineering & Chaos Control Plane (React 19 + Tailwind v4)
    ├── src/
    │   ├── components/           # UI passiva (WalletOverview, ChaosSimulator, OutboxMonitor, Terminal)
    │   ├── pages/                # OperationsPage (#/operacoes), EngineeringPage (#/provas), TelemetryPage
    │   ├── services/             # apiClient (x-correlation-id) e chaosRunner (rajadas concorrentes)
    │   ├── state/                # idempotencyManager (ciclo de vida de chaves no cliente)
    │   └── utils/                # Conversão monetária blindada (IEEE 754 Float <-> Inteiros em Centavos)
    └── tests/                    # Testes de cliente com Vitest + Testing Library
```

---

## 🗺️ O Que Foi Construído em Cada Fase do Roadmap

### Fases 1 a 3: Core Domain, Concorrência, ACID e Mutação
- **Aritmética Monetária Segura:** Value Object `Money` imutável (`Object.freeze`), rejeitando decimais e valores negativos. Todas as transações ocorrem em inteiros (centavos), eliminando o desvio de precisão do padrão IEEE 754.
- **Isolamento de Concorrência & Bloqueio Pessimista:** Utilização de `SELECT ... FOR UPDATE` via `PostgresWalletRepository.findByIdWithLock`, garantindo serialização estrita de débitos simultâneos na mesma carteira.
- **Idempotência no Domínio:** Bloqueio de cobranças duplicadas com verificação transacional de chave de idempotência (`idempotency_key`), assegurando que requisições repetidas retornem a resposta original sem recalcular saldo.
- **Testes de Mutação com Stryker:** Verificação da robustez das asserções contra mutações em operadores condicionais (`>`, `>=`, `===`, `&&`, `||`), alcançando **86.4% de mutantes eliminados**.

### Fase 4: Segurança Defensiva e Hardening de APIs
- **Proteção Anti-BOLA / IDOR (Broken Object Level Authorization):** Toda consulta e mutação SQL exige chave composta `(id, tenant_id)`. Um inquilino autenticado (`tenant-beta`) recebe `404 Not Found` caso tente ler ou debitar da carteira de outro (`tenant-alpha`), sem revelar a existência do recurso.
- **Validação de Fronteira com Zod:** Validação estrita de schemas de entrada antes de atingir os Casos de Uso (`400 Bad Request` com detalhamento por campo).
- **Tradução e Sanitização de Erros (Anti-Data Leak):** Middleware `errorHandler` centralizado mapeando erros de domínio (`InsufficientFundsError`, `DuplicateTransactionError`) para status HTTP sem vazar stack traces, queries SQL ou nomes de tabelas em erros internos (`500`).

### Fase 5: Confiabilidade, Observabilidade e Diagnóstico
- **Rastreamento Assíncrono com `AsyncLocalStorage`:** Propagação contextual de `correlationId` e `tenantId` através de todo o ciclo de vida da requisição, sem necessidade de passar parâmetros em cascata por funções internas.
- **Logger JSON Estruturado & Mascaramento:** Emissão padronizada de logs em JSON com metadados automáticos e anonimização de credenciais/chaves sensíveis.
- **Métricas RED em Tempo Real:** Coleta de **Rate** (volume de requisições por rota), **Errors** (percentual de falhas) e **Duration** (latência média em ms).
- **Resiliência com Backoff Exponencial + Jitter:** Utilitário `retryWithJitter` para lidar com instabilidades transitórias de rede, abortando imediatamente diante de falhas de negócio determinísticas.

### Fase 6: System Design, Transactional Outbox e Governança
- **Padrão Transactional Outbox:** Persistência atômica da alteração de saldo e do evento correspondente (`PAYMENT_PROCESSED`) na tabela `outbox_events` sob a mesma transação SQL (`BEGIN ... COMMIT`), sanando o *Dual-Write Problem*.
- **Outbox Worker com `SKIP LOCKED`:** Polling de eventos pendentes usando `SELECT ... FOR UPDATE SKIP LOCKED`, viabilizando múltiplos workers concorrentes sem concorrência destrutiva nem travamento de lotes.
- **Consumidor Idempotente:** Despachante resiliente pareado com consumidor preparado para descartar eventos duplicados, atingindo consistência eventual segura.
- **Governança com ADRs e Post-Mortem:** Documentação formal de decisões arquiteturais ([ADR-001](docs/adr/adr-001-transactional-outbox-and-modular-monolith.md)), planos de consulta ([EXPLAIN ANALYZE](docs/database/explain-analyze-ledger.md)) e investigação post-mortem de falhas ([Incidente 01](docs/post-mortems/incidente-01-post-mortem.md)).

### Fase 7: Frontend Engineering & Chaos Playground (`web/`)
Toda a lógica de cliente (`currency`, `idempotencyManager`, `apiClient` e `chaosRunner`) e os componentes visuais já estão implementados e cobertos por testes unitários e de mutação, operando atualmente de forma desacoplada através de fixtures determinísticas enquanto a ponte HTTP final (Composition Root / rotas em tempo real do `server/`) está sendo conectada.

Em vez de uma tela de pagamentos comum, a interface foi desenvolvida como um **Painel de Controle e Auditoria de Engenharia**:
- **Simulador de Ataque BOLA:** Dispara operações cruzadas entre tenants para validação visual da barreira `404` na borda.
- **Rajada Concorrente (Race Condition Burst):** Emite disparos paralelos via `Promise.all` reutilizando a mesma chave de idempotência, comprovando em tempo real `1x 200 OK` e as demais requisições devidamente contidas via `chaosRunner`.
- **Monitor de Outbox & Terminal de Telemetria:** Acompanhamento do ciclo de vida dos eventos transacionais (`PENDING` → `PROCESSED`) e visualização dos pacotes HTTP acompanhados de `x-correlation-id` e tempo de resposta.

---

## 🧪 Como Executar e Auditar a Qualidade

### 1. Pré-requisitos
- **Node.js:** v22.12+ (ou v24 LTS)
- **Docker & Docker Compose** (para o PostgreSQL local)

### 2. Configuração de Variáveis de Ambiente
Copie os exemplos de ambiente (nenhuma credencial real é versionada):

```sh
# Configuração do banco no backend
cp server/.env.example server/.env

# Configuração opcional de API no frontend
cp web/.env.example web/.env
```

> Preencha `server/.env` com as credenciais locais desejadas para a instância de teste do PostgreSQL.

### 3. Subir o Banco de Dados (PostgreSQL)

```sh
docker compose -f server/docker-compose.yml up -d
```

> **Inicialização do Banco:** O Docker Compose já executa automaticamente os scripts de inicialização SQL montados em `/docker-entrypoint-initdb.d/` na primeira subida do container, criando as tabelas estruturais de carteiras, ledger e índices sem necessidade de rodar comandos manuais de migração adicionais.

### 4. Instalação e Execução das Suítes de Teste

O projeto gerencia dependências isoladas em cada camada:

```sh
# Instalar dependências do Backend e Frontend
npm install --prefix server
npm install --prefix web

# Executar suíte completa de testes do Backend (Unitários, Segurança BOLA, ACID, Outbox e Métricas)
npm test --prefix server

# Executar suíte de testes de integração e lógica do Frontend (Moeda, API Client, Idempotência e Caos)
npm test --prefix web

# Executar a bateria de Testes de Mutação (Stryker Mutator) no Backend
npm run test:mutate --prefix server

# Executar a bateria de Testes de Mutação no Frontend
npm run test:mutate --prefix web
```

### 5. Executar o Engineering & Chaos Playground (Web)

```sh
npm run dev --prefix web
```

Abra a URL indicada pelo Vite (geralmente `http://localhost:5173`) para acessar o painel de auditoria.

> **Nota Técnica:** O painel `web/` (`npm run dev --prefix web`) já pode ser inspecionado visualmente no navegador com suporte completo a alternância de tenants, disparos simulados de concorrência, ataques BOLA e inspeção de telemetria. Todas as garantias de backend e frontend podem ser auditadas imediatamente via `npm test --prefix server` e `npm test --prefix web`, enquanto o wiring HTTP definitivo (Composition Root / rotas em tempo real) entre os dois serviços está em fase final de conclusão.

---

## 📚 Documentação Técnica e Registros Arquiteturais

Os detalhes profundos de design e diagnóstico estão centralizados no diretório [`docs/`](docs/):

- 📄 [ADR-001: Transactional Outbox & Monólito Modular vs. Microsserviços](docs/adr/adr-001-transactional-outbox-and-modular-monolith.md) — Análise de trade-offs de consistência eventual, custos operacionais e uso do PostgreSQL como broker transacional confiável.
- 🔍 [Post-Mortem Técnico: Diagnóstico de Incidente via Métricas RED e Correlation ID](docs/post-mortems/incidente-01-post-mortem.md) — Reprodução e rastreamento forense de um incidente ponta a ponta através de telemetria estruturada.
- ⚡ [Análise de Performance: EXPLAIN ANALYZE no Ledger](docs/database/explain-analyze-ledger.md) — Planos de execução SQL, custos de varredura e estratégia de indexação para alto rendimento.
- 📐 [Especificações Funcionais e Invariantes (Fases 1 a 7)](docs/specs/) — Contratos e critérios de aceitação rigorosos utilizados para guiar a implementação e governar assistentes de código.

---

## 👨🏽‍💻 Autor

**Ivandro Macheque** — Software Engineer (Backend & Systems Architecture)  
- 🌐 **Portfólio & Case Studies:** [machequelabs.com](https://machequelabs.com/)
- 💼 **LinkedIn:** [Ivandro Macheque](https://www.linkedin.com/in/ivandro-macheque-869526363/)
