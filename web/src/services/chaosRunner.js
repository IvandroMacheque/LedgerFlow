export class ChaosRunner {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async runRaceConditionBurst(options) {
    // Dispara N requisições concorrentes com mesma idempotencyKey e consolida 200 vs 409
    const {
      count = 5,
      path,
      tenantId,
      payload,
      idempotencyKey
    } = options

    const requests = []
    for (let i = 0; i < count; i++) {
      requests.push(
        this.apiClient({
          path,
          method: 'POST',
          tenantId,
          body: payload,
          headers: {
            'idempotency-key': idempotencyKey,
          },
        })
      )
    }

    const results = await Promise.all(requests)

    const statuses = results.map(r => r.status);
    const successCount = results.filter(r => r.status === 200).length;
    const conflictCount = results.filter(r => r.status === 409).length;

    return {
      total: results.length,
      successCount,
      conflictCount,
      statuses,
      results,
    }
  }

  async runBolaAttack(options) {
    // Força tenant-beta acessando carteira de tenant-alpha e valida se retorna 404
    const {
      attackerTenant = 'tenant-beta',
      victimWalletId = 'wallet-alpha-1'
    } = options

    const response = await this.apiClient({
      path: '/api/v1/wallets/' + victimWalletId,
      method: 'GET',
      tenantId: attackerTenant
    })

    return {
      isBlocked: response.status === 404 || response.status === 403,
      status: response.status,
      victimWalletId,
      attackerTenant,
      response,
    }
  }
}

