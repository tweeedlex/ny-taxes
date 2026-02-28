import { z } from "zod";

const noWhitespace = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((v) => !/\s/.test(v), { message: `${label} must not contain spaces` });

export const loginSchema = z.object({
  login: noWhitespace("Login"),
  password: noWhitespace("Password"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  login: noWhitespace("Login"),
  password: noWhitespace("Password").min(8, "Password must be at least 8 characters"),
  full_name: z.string().optional(), 
});

export type RegisterFormValues = z.infer<typeof registerSchema>;