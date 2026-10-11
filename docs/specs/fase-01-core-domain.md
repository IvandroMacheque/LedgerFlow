# Especificação Funcional — Fase 1: Core de Domínio Transacional

**Objetivo:** Implementar o motor de regras de negócio de cálculo de taxas, movimentação de carteira, estornos e idempotência em memória. Nenhum framework ou banco de dados externo é permitido nesta fase.

---

## 1. Módulo: FeeCalculator (`src/domain/feeCalculator.js`)
Calcula a taxa operacional cobrada pela plataforma sobre uma transação financeira.

### 1.1 Regras de Negócio e Invariantes
- **Unidade Monetária:** Todos os valores numéricos representam centavos inteiros (ex.: `1000` = 10,00 MZN/BRL/USD).
- **Taxa Base:** A taxa padrão é de 2.5% sobre o valor bruto da transação.
- **Piso Mínimo:** A taxa nunca pode ser menor que 50 centavos.
- **Teto Máximo:** A taxa nunca pode exceder 1.500 centavos (15,00).
- **Arredondamento:** Se o cálculo percentual resultar em fração de centavo, arredonde para cima (`Math.ceil`).

### 1.2 Casos de Teste Obrigatórios (Critérios de Aceitação)

| Cenário | Entrada (`amountInCents`) | Saída Esperada | Justificativa |
| :--- | :--- | :--- | :--- |
| Piso Mínimo | `1000` (10,00) | `50` | 2.5% de 1000 = 25. Aplica-se o piso mínimo de 50. |
| Taxa Percentual Padrão | `10000` (100,00) | `250` | 2.5% de 10000 = 250. Fica entre o piso (50) e o teto (1500). |
| Teto Máximo | `100000` (1.000,00) | `1500` | 2.5% de 100000 = 2500. Aplica-se o teto de 1500. |
| Valor no Limite Exato do Piso | `2000` (20,00) | `50` | 2.5% de 2000 = 50 exatos. |
| Valor no Limite Exato do Teto | `60000` (600,00) | `1500` | 2.5% de 60000 = 1500 exatos. |
| Entrada Inválida: Não-Inteiro | `100.5` | Lança `TypeError` | Valores fracionados de centavos não são aceitos. |
| Entrada Inválida: Negativo ou Zero | `-500` ou `0` | Lança `RangeError` | O valor da transação deve ser estritamente maior que zero. |

---

## 2. Módulo: Errors (`src/domain/errors.js`)
Erros customizados de domínio para garantir que falhas de negócio não sejam tratadas como exceções genéricas.

### 2.1 Especificação
- **`InsufficientFundsError`:** Deve herdar de `Error`, ter a propriedade `name = "InsufficientFundsError"` e conter mensagem descritiva indicando saldo atual e valor solicitado.
- **`DuplicateTransactionError`:** Deve herdar de `Error`, ter a propriedade `name = "DuplicateTransactionError"` e conter a chave de idempotência duplicada.

---

## 3. Módulo: WalletOperations (`src/domain/walletOperations.js`)
Funções puras que recebem o estado atual da carteira e uma intenção de transação, retornando o novo estado sem mutar o objeto original.

### 3.1 Estrutura de Dados
```javascript
// Objeto Wallet
{
  id: "wallet-123",
  tenantId: "tenant-abc",
  balanceCents: 5000 // 50,00
}

// Objeto Transaction
{
  id: "tx-999",
  type: "DEBIT" | "CREDIT",
  amountCents: 2000,
  feeCents: 50,
  idempotencyKey: "unique-key-1"
}
```

### 3.2 Regras de Negócio e Invariantes
- **Imutabilidade:** As funções não podem alterar a carteira recebida diretamente (`wallet.balanceCents = ...` é proibido). Devem retornar uma nova instância ou cópia com `Object.freeze`.
- **Débito (`applyDebit`):**
  - O valor deduzido da carteira é: `amountCents + feeCents`.
  - Se `(amountCents + feeCents) > wallet.balanceCents`, lançar `InsufficientFundsError`.
  - Saldo resultante = `saldoAtual - (amountCents + feeCents)`.
- **Crédito (`applyCredit`):**
  - O valor líquido creditado na carteira é: `amountCents - feeCents`.
  - Se `feeCents >= amountCents`, lançar `RangeError` (a taxa não pode consumir a totalidade do crédito).
  - Saldo resultante = `saldoAtual + (amountCents - feeCents)`.
- **Estorno de Débito (`applyRefund`):**
  - Entrada: a carteira atual e o objeto da transação de débito original que está sendo estornada.
  - Regra da Plataforma: Devolve apenas o valor principal (`amountCents`). A taxa (`feeCents`) não é reembolsada ao usuário (fica retida pela plataforma).
  - Saldo resultante = `saldoAtual + originalTransaction.amountCents`.

### 3.3 Casos de Teste Obrigatórios (Critérios de Aceitação)
- **Débito com saldo suficiente:** Carteira com 10.000, débito de 2.000 + taxa de 50 $\rightarrow$ Saldo final deve ser 7.950. A carteira original permanece com 10.000.
- **Débito com saldo insuficiente:** Carteira com 1.000, tentativa de debitar 1.000 + taxa de 50 $\rightarrow$ Deve lançar `InsufficientFundsError`.
- **Crédito válido:** Carteira com 1.000, crédito bruto de 5.000 com taxa de 125 $\rightarrow$ Saldo final deve ser 5.875.
- **Estorno de débito:** Carteira com 5.000, estorno de transação de débito (valor 2.000, taxa 50) $\rightarrow$ Saldo final deve ser 7.000 (apenas os 2.000 entram de volta).

---

## 4. Módulo: IdempotencyStore (`src/domain/idempotencyStore.js`)
Controlador em memória para garantir que requisições repetidas com a mesma chave não executem operações em duplicidade.

### 4.1 Especificação da Classe / Estrutura
- **Método `has(key)`:** Retorna `true` se a chave já foi registrada; caso contrário, `false`.
- **Método `save(key, result)`:** Armazena o resultado associado à chave. Se a chave já existir, lança `DuplicateTransactionError`.
- **Método `get(key)`:** Retorna o resultado armazenado daquela operação anterior.

### 4.2 Casos de Teste Obrigatórios
- Salvar uma chave inédita $\rightarrow$ Retorna com sucesso e `has(key)` passa a ser `true`.
- Consultar uma chave existente $\rightarrow$ Retorna exatamente o payload armazenado anteriormente.
- Tentar salvar a mesma chave duas vezes $\rightarrow$ Lança `DuplicateTransactionError` na segunda tentativa.
