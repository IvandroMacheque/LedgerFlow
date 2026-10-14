import { z } from 'zod';

export const paymentSchema = z.object({
    tenantId: z.string().min(1).regex(/^[a-zA-Z0-9-]+$/),
    walletId: z.string().min(1),
    amountInCents: z.number().int().positive(),
    idempotencyKey: z.string().min(16),
    type: z.enum(['DEBIT', 'CREDIT'])
}).strict()
