import { z } from 'zod'

const VALID_AUTHORITIES = ['read_users', 'edit_users', 'read_orders', 'edit_orders'] as const

export const createUserSchema = z.object({
  login: z.string().min(3, 'Login must be at least 3 characters').max(64),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  full_name: z.string().optional(),
  is_active: z.boolean(),
  authorities: z.array(z.enum(VALID_AUTHORITIES)),
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>

export const editUserSchema = z.object({
  login: z.string().min(3).max(64).optional(),
  password: z.string().min(8).max(128).optional().or(z.literal('')),
  full_name: z.string().optional(),
  is_active: z.boolean(),
  authorities: z.array(z.enum(VALID_AUTHORITIES)),
})

export type EditUserFormValues = z.infer<typeof editUserSchema>

export { VALID_AUTHORITIES }
