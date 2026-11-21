import { z } from 'zod'
export const roleSchema = z.object({ isAdmin: z.boolean() })
export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  blocked: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'Informe uma alteração.')
  .refine(value => value.isAdmin === undefined || Object.keys(value).length === 1, 'Altere o papel separadamente.')
