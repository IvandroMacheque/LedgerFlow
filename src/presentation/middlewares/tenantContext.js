export function tenantContext(req, res, next) {
  // Stub inicial: extrair x-tenant-id e validar presença
  const tenantId = req.headers['x-tenant-id']
  console.log(tenantId)

  if (!tenantId || typeof tenantId ==! 'string' || tenantId.trim() === '') {
    return res.status(401).json({ error: 'Tenant context ausente' })
  }

  req.tenantId = tenantId

  // return e necessario para permitir que funcoes assincronas funcionem
  return next();
}

