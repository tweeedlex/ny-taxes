import { z } from 'zod'

export const loginSchema = z.object({
  login: z.string().min(3, 'Login must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  login: z.string().min(3, 'Login must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().optional(),
})

export type RegisterFormValues = z.infer<typeof registerSchema>
