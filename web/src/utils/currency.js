/** @param {string|number} decimalValue @returns {number} */
export function toCents(decimalValue) {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Converter decimal BRL para inteiro em centavos,
  // sem imprecisão de ponto flutuante; definir rejeição de formatos inválidos.
  // Stub fixo: não utiliza decimalValue e não deve alimentar pagamentos reais.

  if ( decimalValue === null || decimalValue === undefined) throw new Error ('Valor monetário inválido')
  if (typeof decimalValue === 'string' && decimalValue.trim() === '') throw new Error ('Valor monetário inválido')

  let numero = decimalValue
  if (typeof numero === 'string') {
    numero = Number(decimalValue.trim().replace(',', '.'))
  }

  if (numero <= 0) throw new Error ('Valor monetário deve ser maior que zero')
  if (Number.isNaN(numero) || !Number.isFinite(numero)) throw new Error ('Valor monetário inválido')
  
  const value = Math.round(numero * 100)

  return value
}

/** @param {number} amountInCents @returns {string} */
export function formatCurrency(amountInCents) {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Formatar centavos como BRL em pt-BR.
  // Stub fixo: não utiliza amountInCents; o overview recebe o texto por props.
  const reais = amountInCents / 100

  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}
