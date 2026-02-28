import { z } from "zod";

export const VALID_AUTHORITIES = [
  "read_users",
  "edit_users",
  "read_orders",
  "edit_orders",
] as const;

const authorityEnum = z.enum(VALID_AUTHORITIES);

const noWhitespace = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((v) => !/\s/.test(v), {
      message: `${label} must not contain spaces`,
    });

export const createUserSchema = z.object({
  login: noWhitespace("Login")
    .min(3, "Login must be at least 3 characters")
    .max(64, "Login must be at most 64 characters"),

  password: noWhitespace("Password")
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),

  full_name: z.string().optional(),

  // если ты убрал свитч — можно оставить как есть, или default(true)
  is_active: z.boolean().default(true),

  // важное: хотя бы одна роль
  authorities: z.array(authorityEnum).min(1, "Select at least one authority"),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  login: z
    .string()
    .min(3, "Login must be at least 3 characters")
    .max(64, "Login must be at most 64 characters")
    .refine((v) => !/\s/.test(v), { message: "Login must not contain spaces" })
    .optional(),

  password: z
    .union([
      z.literal(""),
      z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must be at most 128 characters")
        .refine((v) => !/\s/.test(v), {
          message: "Password must not contain spaces",
        }),
    ])
    .optional(),

  full_name: z.string().optional(),
  is_active: z.boolean(),
  authorities: z.array(authorityEnum),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;
