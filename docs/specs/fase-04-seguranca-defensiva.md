# Especificação Funcional — Fase 4: Segurança Defensiva & OWASP API Top 1

**Objetivo:** Blindar os pontos de entrada do LedgerFlow contra ataques de BOLA/IDOR, validar rigorosamente payloads com Zod em tempo de execução, sanitizar dados sensíveis em logs e demonstrar via testes de segurança automatizados que acessos cruzados entre diferentes tenants retornam 403 Forbidden ou 404 Not Found.

---

## 1. Topologia de Diretórios Atualizada

Adicionamos a camada de apresentação e os validadores de segurança sem contaminar o `domain/`:

```text
src/
├── domain/                      # Regras puras intactas
├── application/                 # Use Cases intactos
├── infra/                       # Repositórios e DB intactos
└── presentation/                # CAMADA DE BORDA / HTTP / PROTOCOLO
    ├── schemas/
    │   └── paymentSchema.js     # Validações estritas com Zod
    ├── middlewares/
    │   ├── tenantContext.js     # Extração e validação do Tenant Context
    │   └── errorHandler.js      # Formatação defensiva de erros (sem vazar stack trace)
    └── controllers/
        └── PaymentController.js # Orquestração da requisição
```

---

## 2. Validação Estrita de Entrada com Zod (`src/presentation/schemas/paymentSchema.js`)

Nenhum dado não validado pode tocar os casos de uso. O schema deve barrar injeções de tipos, números negativos, decimais e payloads maliciosos.

### 2.1 Requisitos do Schema:
- `tenantId`: string não vazia, sem caracteres especiais perigosos (ex.: alfanumérica com hífens).
- `walletId`: string não vazia.
- `amountInCents`: número inteiro positivo (`int()`, `positive()`). Rejeitar strings numéricas (`"1000"`), floats (`10.50`) e negativos.
- `idempotencyKey`: string obrigatória com tamanho mínimo de 16 caracteres.
- `type`: enum estrito `['DEBIT', 'CREDIT']`.

---

## 3. Isolamento Multitenancy & Prevenção BOLA (`src/presentation/middlewares/tenantContext.js`)

### 3.1 Regras de Autorização a Nível de Objeto
- O `tenantId` provém do contexto de identidade seguro (ex.: cabeçalho `x-tenant-id` ou token JWT simulado), nunca de parâmetros soltos manipuláveis sem verificação.
- **Invariante de Isolamento:** Se o `tenant-1` tentar executar uma transação apontando para uma carteira `wallet-2` que pertence ao `tenant-2`:
  - O repositório deve falhar a busca (`WHERE id = $1 AND tenant_id = $2`).
  - A camada de apresentação deve retornar erro padronizado: `404 Not Found` (ou `403 Forbidden`).
### 3.2 Mecânica da Defesa BOLA Implementada
1. **Contexto de Borda (Edge):** O middleware `tenantContext` lê o cabeçalho `x-tenant-id` (ou token) e define `req.tenantId`. Sem este cabeçalho, a requisição é barrada com `401 Unauthorized`.
2. **Imposição no Controller:** O `PaymentController` sobrescreve qualquer `tenantId` que venha no `req.body` com `req.tenantId`. O cliente nunca tem autoridade para ditar seu próprio tenant no corpo da requisição.
3. **Isolamento no Repositório:** A query SQL de busca/lock utiliza a chave composta `WHERE id = $1 AND tenant_id = $2`.
4. **Prevenção de Enumeração de Objetos:** Quando `tenant-B` tenta acessar uma carteira de `tenant-A`, a consulta retorna `null`. A resposta HTTP é estritamente `404 Not Found` com mensagem neutra `"Carteira não encontrada"`. O atacante nunca descobre se o ID existe ou não sob a custódia de outro cliente.

---

## 4. Tratamento Defensivo de Erros & Sanitização

### 4.1 `src/presentation/middlewares/errorHandler.js`
- **Erros de validação Zod** $\rightarrow$ Retornam status `400 Bad Request` com lista clara de campos inválidos.
- **Erros de negócio (`InsufficientFundsError`, etc.)** $\rightarrow$ Retornam status `422 Unprocessable Entity` ou `409 Conflict`.
- **Erros inesperados de infraestrutura (banco fora, erro de sintaxe)** $\rightarrow$ Retornam status `500 Internal Server Error` com mensagem genérica `"Ocorreu um erro interno"`. **Nunca expor o stack trace, queries SQL ou variáveis de ambiente na resposta!**

---

## 5. Critérios de Aceitação e Testes de Segurança

| Arquivo de Teste | Objetivo | Cenário de Teste | Status |
| :--- | :--- | :--- | :--- |
| `tests/security/paymentSchema.spec.js` | Blindagem de Tipos | Testar payloads com floats, strings em campos numéricos, payload pollution e campos extras. Garantir rejeição imediata. | **Concluído (GREEN)** |
| `tests/security/BolaProtection.spec.js` | A Prova BOLA/IDOR | Criar carteira no `tenant-A`. Executar requisição autenticada como `tenant-B` tentando debitar a carteira do `tenant-A`. Deve falhar com 404/Erro de posse. | **Concluído (GREEN)** |
| `tests/security/ErrorSanitization.spec.js` | Prevenção de Leak | Simular falha de conexão do PostgreSQL e validar que o corpo da resposta não contém dados sensíveis como usuário do banco, senhas ou termos de SQL. | **Concluído (GREEN)** |

