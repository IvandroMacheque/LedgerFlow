# Relatório de Post-Mortem & ADR — Incidente #01

**Data do Incidente:** 16 de Outubro de 2026  
**Severidade:** SEV-1 (Falha Crítica de Conexão com Banco de Dados)  
**Status:** Resolvido / Mitigado com Telemetria e Resiliência  
**Autores:** Engenharia de Plataforma e Confiabilidade LedgerFlow  

---

## 1. Resumo Executivo (Sintomas & Impacto)

Durante o pico de processamento no endpoint de pagamentos (`POST /payments`), o coletor de métricas RED em memória acusou uma anomalia severa:
- **Rate:** 100% das requisições afetadas durante a janela da falha.
- **Error Rate:** Taxa de erro saltou para **100%** com códigos HTTP 500.
- **Duration (Latência):** Aumento anormal na duração das requisições devido às tentativas de conexão antes do descarte.

---

## 2. Linha do Tempo e Rastreamento pelo Correlation ID

Graças à adoção do `AsyncLocalStorage` e do `observabilityMiddleware`, a requisição afetada foi carimbada na porta de entrada com o código de rastreio único:
- **Correlation ID Isolado:** `incidente-uuid-777`

### Evidências Coletadas nos Logs Estruturados (JSON):
```json
{
  "timestamp": "2026-10-16T18:14:55.223Z",
  "level": "WARN",
  "message": "Tentativa 1 falhou. Retentando em 0ms...",
  "correlationId": "incidente-uuid-777",
  "metadata": { "attempt": 1, "delayMs": 0, "error": "FATAL: Database connection timeout" }
}
```
```json
{
  "timestamp": "2026-10-16T18:14:55.227Z",
  "level": "WARN",
  "message": "Tentativa 2 falhou. Retentando em 2ms...",
  "correlationId": "incidente-uuid-777",
  "metadata": { "attempt": 2, "delayMs": 2, "error": "FATAL: Database connection timeout" }
}
```
```json
{
  "timestamp": "2026-10-16T18:14:55.230Z",
  "level": "ERROR",
  "message": "FATAL: Database connection timeout",
  "correlationId": "incidente-uuid-777",
  "error": {
    "name": "Error",
    "message": "FATAL: Database connection timeout",
    "stack": "Error: FATAL: Database connection timeout\n    at operacaoBanco..."
  }
}
```

---

## 3. Causa-Raiz (Root Cause Analysis - RCA)

- **Causa Física:** Queda transitória de conectividade e esgotamento do pool de conexões no PostgreSQL (`FATAL: Database connection timeout`).
- **Defesa Aplicada:** O mecanismo `retryWithJitter` interceptou a falha e tentou a recuperação por 3 vezes consecutivas. Como a indisponibilidade ultrapassou a janela das retentativas, o sistema não entrou em loop infinito e abortou com segurança.
- **Sanitização de Segurança:** O `errorHandler` interceptou a falha fatal, registrou a stack trace real e o segredo interno no `stderr` para a equipe de SRE, mas devolveu ao cliente externo uma resposta 100% sanitizada (`500: "Ocorreu um erro interno"`), evitando qualquer vazamento de infraestrutura (OWASP API Top 10).

---

## 4. Registro de Decisão de Arquitetura (ADR)

### ADR-005: Adoção de Telemetria com AsyncLocalStorage e Retry com Full Jitter

* **Contexto:** Necessidade de observar, rastrear e proteger transações financeiras contra falhas transitórias de infraestrutura sem poluir a assinatura do Domínio com identificadores de rastreio (`correlationId`).
* **Decisão:**
  1. Usar o `node:async_hooks` (`AsyncLocalStorage`) para isolamento de contexto por requisição em memória.
  2. Implementar Logger JSON estruturado de linha única com sanitização automática de chaves sensíveis (`password`, `token`, `secret`).
  3. Adotar `retryWithJitter` com algoritmo de Full Jitter ($random(0, base \times 2^{attempt})$) para mitigar o problema do Efeito Manada (*Thundering Herd*).
* **Consequências Positivas:**
  - Diagnóstico cirúrgico em menos de 1 minuto usando o `correlationId`.
  - Zero poluição nos Casos de Uso ou Entidades.
  - Blindagem contra ataques DDoS acidentais contra o próprio banco de dados durante quedas parciais.

