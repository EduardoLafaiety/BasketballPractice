import { z } from 'zod'
export const roleSchema = z.object({ isAdmin: z.boolean() })
