import { Money } from "../../domain/Money"
import { Wallet } from "../../domain/Wallet"

export class PostgresWalletRepository {
    
    constructor (pool) {
        this.pool = pool
    }

    async findById (id, tenantId) {
        const query = 'SELECT id, tenant_id, balance_cents FROM wallets WHERE id = $1 AND tenant_id = $2;'
        const result = await this.pool.query(query, [id, tenantId])

        const row = result?.rows?.[0]

        if (!row) {
            return null
        }


        return new Wallet(
            row.id, 
            row.tenant_id, 
            new Money(Number(row.balance_cents))
        )
    }

    async findByIdWithLock (id, tenantId, client) {
        const query = 'SELECT id, tenant_id, balance_cents FROM wallets WHERE id = $1 AND tenant_id = $2 FOR UPDATE;'
        const result = await client.query(query, [id, tenantId])

        const row = result?.rows?.[0]

        if (!row) {
            return null
        }


        return new Wallet(
            row.id, 
            row.tenant_id, 
            new Money(Number(row.balance_cents))
        )
    }

    async save(wallet, client = null) {

        const executor = client || this.pool
        const query = `
        INSERT INTO wallets (id, tenant_id, balance_cents, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (tenant_id, id)
        DO UPDATE SET balance_cents = EXCLUDED.balance_cents, updated_at = NOW();
    `
    // $1 = wallet.id
    // $2 = wallet.tenantId
    // $3 = wallet.balance.amountInCents
    await executor.query(query, [
        wallet.id,
        wallet.tenantId,
        wallet.balance.amountInCents
    ])
    }

    async runInTransaction(callback) {
        // pedir uma conexao dedicada
        const client = await this.pool.connect()

        try{
            // iniciar a transacao
            await client.query('BEGIN')

            // executar a funcao
            const result = await callback(client)

            // se termina sem erros
            await client.query('COMMIT')

            return result 

        } catch (error) {
            // se deu qualquer erro no meio
            await client.query('ROLLBACK')
            // repassa o erro para quem chamou saber que falhou
            throw error
        } finally {
            // devolve a conexao de volta para o pool
            client.release()
        }
    }


}

