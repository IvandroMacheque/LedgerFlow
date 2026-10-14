import z from "zod"
import { DuplicateTransactionError, InsufficientFundsError } from "../../domain/errors"

export function errorHandler(err, req, res, next) {
  // Stub inicial do middleware de tratamento de erro

  if (err instanceof z.ZodError || err?.name === 'ZodError') {
    return res.status(400).json({
      // error: 'ValidationError',
      // message: 'Dados de entrada Invalidos',
      // details: err.errors.map((err) => ({
      //   field: err.path.join(','),
      //   message: err.message
      // }))
      error: err.issues
    }) 
  }

  if (err instanceof InsufficientFundsError || err.name === 'InsufficientFoundsError') {
    return res.status(422).json({
      error: err.message
    })
  }

  if (err instanceof DuplicateTransactionError || err.name === 'DuplicateTransactionError') {
    return res.status(409).json({
      error: err.message
    })
  }

  if (err instanceof Error) {
    return res.status(500).json({
      error: "Ocorreu um erro interno"
    })
  }
}
