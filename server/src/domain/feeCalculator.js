export function calculateFee(amountInCents){

    // fee nao inteiro retorna um erro
    if (!Number.isInteger(amountInCents)) throw new TypeError("O valor em centavos deve ser um numero inteiro")

    // fee menor ou igual a 0 retorna um erro
    if (amountInCents <= 0) throw new RangeError("Insira um valor maior que 0")

    const fee = Math.ceil(amountInCents * 0.025)

    // fee menor que 50, assumimos 50. E fee maior que 1500, assumimos 1500
    return Math.min(1500, Math.max(50, fee))

}

