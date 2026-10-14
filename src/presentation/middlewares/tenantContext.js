export function tenantContext(req, res, next) {
  // Stub inicial: extrair x-tenant-id e validar presença
  const tenantId = req.headers['x-tenant-id']

  if (!tenantId) {
    return res.status(401).json({ error: 'Tenant context ausente' })
  }

  req.tenantId = tenantId
  next();
}

