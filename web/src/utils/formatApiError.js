/**
 * Normaliza payloads de erro da API (incluindo arrays `err.issues` do Zod)
 * para `{ message: string, fields?: Record<string, string> }` seguro para renderização React.
 * @param {any} errBody
 * @param {string} fallback
 * @returns {{ message: string, fields?: Record<string, string> }}
 */
export function formatApiError(errBody, fallback = 'Erro na operação.') {
  if (!errBody) return { message: fallback };
  if (typeof errBody === 'string') return { message: errBody };

  if (typeof errBody.message === 'string') {
    return { message: errBody.message, fields: errBody.fields };
  }

  if (Array.isArray(errBody.error)) {
    const fields = {};
    const parts = errBody.error.map((issue) => {
      const key = Array.isArray(issue?.path) && issue.path.length > 0 ? issue.path.join('.') : 'payload';
      const msg = typeof issue?.message === 'string' ? issue.message : 'Valor inválido';
      fields[key] = msg;
      return `${key}: ${msg}`;
    });
    return {
      message: parts.length > 0 ? `ValidationError (${parts.join('; ')})` : 'ValidationError',
      fields,
    };
  }

  if (typeof errBody.error === 'string') {
    return { message: errBody.error, fields: errBody.fields };
  }

  return { message: fallback };
}
