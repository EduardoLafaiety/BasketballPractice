import { z } from 'zod'
import { dbId } from '../../lib/validate.js'

export const programParam = z.object({ id: z.string().max(60) })
export const dayParam = programParam.extend({ day: z.coerce.number().int().min(1).max(366) })
export const completeSchema = z.object({ sessionId: dbId.nullish() }).default({})
