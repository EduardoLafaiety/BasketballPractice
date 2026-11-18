import { z } from 'zod'
export const styleParam = z.object({ id: z.string().regex(/^[a-z-]{1,60}$/) })
