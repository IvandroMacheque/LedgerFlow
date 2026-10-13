# Análise de Performance e Otimização de Consultas SQL

> **Entregável Mensurável da Fase 3:** Otimização de consulta lenta de extrato/ledger documentada com base em planos de execução reais gerados via `EXPLAIN (ANALYZE, BUFFERS)`.

---

## 1. Cenário do Teste de Carga

- **Tabela:** `ledger_entries`
- **Volume de dados inseridos:** 100.000 lançamentos financeiros gerados via `generate_series`.
- **Consulta Realizada (Consulta de Extrato / Paginação de 20 itens):**
  ```sql
  SELECT id, amount_cents, fee_cents, created_at 
  FROM ledger_entries 
  WHERE tenant_id = 'tenant-perf' 
    AND wallet_id = 'wallet-perf-test' 
  ORDER BY created_at DESC 
  LIMIT 20;
  ```

---

## 2. Cenário A: Consulta NÃO Otimizada (Varredura Sequencial - `Seq Scan`)

Sem utilizar o índice composto, o PostgreSQL precisou varrer todas as páginas da tabela no disco e ordenar os dados em memória usando Top-N Heapsort.

```text
Limit  (cost=4876.65..4878.95 rows=20 width=35) (actual time=656.443..740.157 rows=20 loops=1)
   Buffers: shared hit=1466
   ->  Gather Merge  (cost=4876.65..11641.41 rows=58824 width=35) (actual time=656.157..737.977 rows=20 loops=1)
         Workers Planned: 1
         Workers Launched: 1
         Buffers: shared hit=1466
         ->  Sort  (cost=3876.64..4023.70 rows=58824 width=35) (actual time=448.129..448.149 rows=20 loops=2)
               Sort Key: created_at DESC
               Sort Method: top-N heapsort  Memory: 26kB
               Buffers: shared hit=1466
               Worker 0:  Sort Method: top-N heapsort  Memory: 26kB
               ->  Parallel Seq Scan on ledger_entries  (cost=0.00..2311.35 rows=58824 width=35) (actual time=4.105..268.234 rows=50000 loops=2)
                     Filter: (((tenant_id)::text = 'tenant-perf'::text) AND ((wallet_id)::text = 'wallet-perf-test'::text))
                     Buffers: shared hit=1429
 Planning Time: 26.998 ms
 Execution Time: 746.061 ms
```

- **Execution Time:** **746.06 ms** (~0.75 segundos para apenas 20 linhas!).
- **Buffer Pages lidas:** 1.466 páginas de memória/disco.
- **Gargalo:** `Parallel Seq Scan` + ordenação manual com workers paralelos.

---

## 3. Cenário B: Consulta Otimizada com Índice B-Tree Composto (`Index Scan`)

Utilizando o índice composto criado na migração:
```sql
CREATE INDEX idx_ledger_wallet_tenant 
ON ledger_entries (tenant_id, wallet_id, created_at DESC);
```

Plano de execução gerado:

```text
Limit  (cost=0.42..2.06 rows=20 width=35) (actual time=7.347..7.415 rows=20 loops=1)
   Buffers: shared hit=4
   ->  Index Scan using idx_ledger_wallet_tenant on ledger_entries  (cost=0.42..8202.67 rows=100000 width=35) (actual time=7.337..7.383 rows=20 loops=1)
         Index Cond: (((tenant_id)::text = 'tenant-perf'::text) AND ((wallet_id)::text = 'wallet-perf-test'::text))
         Buffers: shared hit=4
 Planning Time: 36.184 ms
 Execution Time: 10.62 ms
```

- **Execution Time:** **10.62 ms** (Redução de **746 ms para 10 ms** $\rightarrow$ **~70x mais rápido**!).
- **Buffer Pages lidas:** Reduzidas de 1.466 para **apenas 4 páginas** de memória!
- **Por que é tão mais rápido?** A árvore B-Tree já mantém as chaves `tenant_id` e `wallet_id` ordenadas por `created_at DESC`. O banco faz um *Index Scan* direto nas primeiras 20 folhas da árvore e encerra a consulta sem tocar nas outras 99.980 linhas.

---

## 4. Síntese dos Padrões de Banco para Produção

| Desafio | Solução de Engenharia |
| :--- | :--- |
| **Consultas lentas / Alto I/O** | Índices B-Tree compostos cobrindo filtros e ordenação (`tenant_id, wallet_id, created_at DESC`). |
| **Colunas JSONB / Busca Textual** | Índices GIN (*Generalized Inverted Index*). |
| **Alteração de schema sem downtime** | Migrações *Expand and Contract* (adicionar coluna paralela $\rightarrow$ sincronizar $\rightarrow$ virar leitura $\rightarrow$ remover antiga). |
| **Queda de cache com sobrecarga súbita** | *Cache-Aside* protegido com mutex/lock para evitar *Thundering Herd*. |

