# ADR 001: Padrão Transactional Outbox e Monólito Modular em vez de Microsserviços e Filas Dedicadas

* **Status:** Aceito (Accepted)
* **Data:** 19-10-2026
* **Decisores:** Time de Arquitetura & Engenharia do LedgerFlow
* **Contexto Técnico:** Fase 6 — Integração Distribuída, System Design e Resiliência

---

## 1. Contexto do Problema

O LedgerFlow opera movimentações financeiras de alta precisão (débitos, créditos e estornos). Quando uma operação financeira é persistida, serviços externos (gateways parceiros, emissão de comprovantes, conciliação e webhooks de clientes) precisam ser notificados.

O modelo ingênuo de integração distribuída sofre do **Dual-Write Problem**:
- Se salvamos no banco e depois tentamos chamar um Webhook/RabbitMQ/Kafka, um crash do processo ou partição de rede após o `COMMIT` causa perda silenciosa de evento. O dinheiro saiu da conta, mas a notificação nunca existiu.
- Se notificamos o serviço externo antes do `COMMIT`, qualquer falha de disco ou restrição de integridade causa `ROLLBACK` local, mas o mundo externo recebeu um evento fantasma.

---

## 2. Decisão Arquitetural

Decidimos adotar o padrão **Transactional Outbox** suportado pelo próprio motor relacional do PostgreSQL através de:
1. Uma tabela transacional `outbox_events` gravada no **mesmo** contexto de transação ACID (`BEGIN ... COMMIT`) da alteração da carteira (`wallets`).
2. Um worker assíncrono interno (`OutboxWorker`) realizando polling determinístico utilizando a diretiva SQL nativa **`FOR UPDATE SKIP LOCKED`**.
3. Despacho HTTP resiliente com retry exponencial e jitter (`retryWithJitter`), exigindo que os consumidores downstream implementem **Consumidores Idempotentes** deduplicados pelo cabeçalho `x-event-id`.

---

## 3. Análise de Trade-offs e Alternativas Consideradas

| Critério / Abordagem | Transações Distribuídas (2PC / XA) | Fila Externa Prematura (Kafka / RabbitMQ) | Transactional Outbox (PostgreSQL + SKIP LOCKED) |
| :--- | :--- | :--- | :--- |
| **Complexidade Operacional** | Altíssima (coordenação de locks distribuídos) | Média-Alta (Cluster dedicado, schema registry, broker redundante) | **Baixa** (utiliza o PostgreSQL já operacional no projeto) |
| **Garantia de Consistência** | Consistência Imediata (ACID), mas suscetível a bloqueios globais | Risco de Dual-Write caso não implemente Outbox de qualquer forma | **Consistência Eventual Segura** (Garantia atômica ACID local) |
| **Throughput & Contenção** | Extremamente baixo sob concorrência | Altíssimo para milhões de msg/seg | **Excelente** para o estágio atual (até 5.000 tx/s sem locks bloqueantes via `SKIP LOCKED`) |
| **Custo de Infraestrutura** | Elevado e frágil | Custo de nós dedicados e monitoria de filas | **Zero custo adicional de infraestrutura** |

### Por que rejeitamos 2PC (Two-Phase Commit)?
Transações 2PC degradam severamente a latência e criam acoplamento síncrono: se o coordenador ou qualquer nó falha durante a fase de prepare, todos os registros participantes ficam travados até recuperação manual, paralisando a plataforma financeira.

### Por que não adicionamos RabbitMQ ou Kafka agora?
Adicionar um broker de mensagens externo antes de validar o volume real violaria o princípio YAGNI e aumentaria a superfície de falhas. O PostgreSQL moderno, com índices B-Tree e `FOR UPDATE SKIP LOCKED`, atua com perfeição como fila transacional confiável com garantia *At-Least-Once*. Quando o volume escalar para dezenas de milhares de eventos/segundo, poderemos plugar Debezium (CDC) na tabela de outbox sem mudar uma linha do domínio.

---

## 4. Diretrizes de Governança e Qualidade para Agentes de IA

1. **Blindagem de Contratos e Schemas:** Qualquer nova rota, evento ou comando deve passar por validação estrita com Zod (`.strict()`), impedindo injeção de tipos e *Mass Assignment*.
2. **Defesa em Camadas contra BOLA/IDOR:** Parâmetros de contexto e tenancy devem vir obrigatoriamente de cabeçalhos autenticados (`x-tenant-id`), nunca de campos manipuláveis no body.
3. **Esteira de Mutação Inegociável:** Nenhum módulo entra em produção com cobertura de mutação (Stryker) inferior a **85%**. Mutações não mortas indicam ramificações cegas que mascaram bugs de lógica.
4. **Logs Estruturados e Propagação de Telemetria:** Toda operação deve propagar `correlation_id` em todos os saltos (HTTP $\rightarrow$ Use Case $\rightarrow$ Outbox $\rightarrow$ Worker $\rightarrow$ Webhook), garantindo rastreabilidade distribuída de ponta a ponta.

---

## 5. Consequências

### Positivas:
- Eliminação matemática do risco de Dual-Write.
- Atomicidade garantida: ou tudo salva junto, ou sofre rollback conjunto.
- Workers paralelos podem processar eventos simultaneamente sem concorrência destrutiva nem deadlocks via `SKIP LOCKED`.

### Negativas / Mitigações:
- **Consistência Eventual:** Há um atraso de milissegundos entre o débito e a chegada da notificação externa (aceitável pelo modelo de negócio financeiro).
- **Crescimento da tabela `outbox_events`:** Eventos com status `PROCESSED` acumularão com o tempo. Mitigação: job futuro de arquivamento/purga de eventos antigos.

