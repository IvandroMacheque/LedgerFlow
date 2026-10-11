# Especificação Funcional — Fase 2: Clean Architecture & Casos de Uso

> **Objetivo:** Estruturar o LedgerFlow em camadas concêntricas (`domain/` e `application/`), modelar a Entidade `Wallet` com encapsulamento de invariantes, criar o Value Object `Money` e implementar os Casos de Uso com Inversão de Controle usando um Repositório In-Memory.

---

## 1. Topologia de Diretórios

O projeto passa a ter uma fronteira estrita de camadas:

```text
src/
├── domain/                  # CAMADA CENTRAL (Zero dependências externas)
│   ├── errors.js            # Erros de domínio
│   ├── feeCalculator.js     # Regra de cálculo de taxa
│   ├── Money.js             # Value Object monetário imutável
│   ├── Wallet.js            # Entidade de Domínio rica
│   └── WalletRepository.js  # Contrato/Interface conceitual do repositório
│
├── application/             # CAMADA DE CASOS DE USO (Orquestração)
│   ├── ProcessPaymentUseCase.js
│   └── RefundPaymentUseCase.js
│
└── infra/                   # CAMADA DE INFRAESTRUTURA (Borda externa)
    └── repositories/
        └── InMemoryWalletRepository.js
```

---


## 2. Modelagem de Domínio

### 2.1 Value Object: `Money` (`src/domain/Money.js`)

Objetos de valor não possuem identidade própria; são definidos puramente pelo seu valor e são **estritamente imutáveis**.

#### Regras e Invariantes:

1. Recebe um número de centavos inteiros (`amountInCents`).
2. Deve rejeitar decimais (`TypeError`) ou valores negativos (`RangeError`).
3. Operações aritméticas retornam **uma nova instância de `Money`**:
   - `add(money: Money): Money`
   - `subtract(money: Money): Money` (lança `InsufficientFundsError` se o resultado for menor que zero).
   - `isZero(): boolean`
4. A instância deve ser congelada com `Object.freeze`.

---

### 2.2 Entidade: `Wallet` (`src/domain/Wallet.js`)

Diferente das funções puras soltas da Fase 1, a entidade encapsula **identidade e estado**.

#### Regras e Invariantes:

1. **Campos Privados:** O saldo não pode ser alterado por atribuição direta externa (use campos privados JS `#balance` ou controle de acesso via métodos).
2. Propriedades:
   - `id`: string não vazia.
   - `tenantId`: string não vazia (isolamento multi-tenant).
   - `balance`: instância de `Money` (acessível via getter).
3. Métodos de Negócio:
   - `credit(amount: Money, fee: Money): void` $\rightarrow$ debita a taxa do montante e incrementa o saldo.
   - `debit(amount: Money, fee: Money): void` $\rightarrow$ deduz `amount + fee` do saldo. Lança `InsufficientFundsError` se faltar saldo.
   - `refund(originalAmount: Money): void` $\rightarrow$ incrementa o saldo apenas pelo valor principal original (taxa retida).

---

## 3. Contrato da Camada de Persistência

### 3.1 `WalletRepository` (`src/domain/WalletRepository.js`)

Em JavaScript, usamos classes com métodos que lançam erro por padrão para definir interfaces explícitas:

```javascript
export class WalletRepository {
  /**
   * @param {string} id 
   * @param {string} tenantId 
   * @returns {Promise<Wallet|null>}
   */
  async findById(id, tenantId) {
    throw new Error('Método findById não implementado');
  }

  /**
   * @param {Wallet} wallet 
   * @returns {Promise<void>}
   */
  async save(wallet) {
    throw new Error('Método save não implementado');
  }
}
```

---

## 4. Camada de Aplicação (Use Cases)

Os casos de uso coordenam o fluxo: buscam a entidade no repositório, invocam as regras de negócio do domínio e salvam a entidade atualizada.

### 4.1 Caso de Uso: `ProcessPaymentUseCase` (`src/application/ProcessPaymentUseCase.js`)

#### Parâmetros de Entrada:

```javascript
{
  tenantId: "tenant-1",
  walletId: "wallet-100",
  type: "DEBIT" | "CREDIT",
  amountInCents: 5000,
  idempotencyKey: "req-xyz-1"
}
```

#### Fluxo de Execução:

1. **Idempotência:** Consulta o `IdempotencyStore`. Se a chave já existir, retorna imediatamente a resposta anterior sem reprocessar.
2. **Busca da Carteira:** Busca `walletId` filtrando obrigatoriamente por `tenantId`. Se não encontrar, lança `WalletNotFoundError`.
3. **Cálculo da Taxa:** Invoca `calculateFee(amountInCents)`.
4. **Execução no Domínio:** Invoca `wallet.debit(...)` ou `wallet.credit(...)`.
5. **Persistência:** Invoca `walletRepository.save(wallet)`.
6. **Resposta e Cache:** Registra o payload de sucesso no `IdempotencyStore` e retorna o comprovante estruturado.

---

## 5. Camada de Infraestrutura: Adaptador de Teste

### 5.1 `InMemoryWalletRepository` (`src/infra/repositories/InMemoryWalletRepository.js`)

Permite rodar a suíte completa de testes da aplicação em milissegundos sem precisar de Docker ou PostgreSQL ainda.

#### Especificação:

- Armazena instâncias de `Wallet` em um `Map` interno com chave composta (`${tenantId}:${id}`).
- Implementa `findById(id, tenantId)` e `save(wallet)`.
- Retorna sempre clones ou referências protegidas.

---

## 6. Critérios de Aceitação e Roteiro TDD para a Fase 2

| Etapa | Arquivo de Teste | O que deve ser comprovado |
| --- | --- | --- |
| **Ciclo 1** | `tests/Money.spec.js` | Imutabilidade com `Object.freeze`, rejeição de float/negativos, soma e subtração precisa. |
| **Ciclo 2** | `tests/Wallet.spec.js` | Encapsulamento de saldo, débito, crédito e estorno alterando o estado da entidade. |
| **Ciclo 3** | `tests/InMemoryWalletRepository.spec.js` | Salvar e recuperar carteiras por ID isolando por tenant. |
| **Ciclo 4** | `tests/ProcessPaymentUseCase.spec.js` | Orquestração ponta a ponta: pagamento debitado com taxa, persistido no repositório e protegido por idempotência. |

