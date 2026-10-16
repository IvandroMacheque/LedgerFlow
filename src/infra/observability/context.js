import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage()

export function runWithContext(store, callback) {
  // Stub inicial
  return storage.run(store, callback)
}

export function getContext() {
  // Stub inicial
  return storage.getStore() ?? {}
}

export function setTenantId(tenantId) {
  // Stub inicial
  const store = storage.getStore()
  if (store) store.tenantId = tenantId
}

