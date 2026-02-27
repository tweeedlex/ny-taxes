import { z } from 'zod'

export const createOrderSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  subtotal: z.number().min(0),
  timestamp: z.string().min(1, 'Timestamp is required'),
})

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>
