import { z } from 'zod'
// Preferências que acompanham o atleta entre dispositivos. Campos ausentes recebem o padrão.
export const settingsSchema = z.object({
  theme: z.enum(['sistema', 'claro', 'escuro']).default('sistema'),
  reminders: z
    .object({
      enabled: z.boolean().default(false),
      time: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido')
        .default('18:00'),
      days: z.array(z.number().int().min(0).max(6)).max(7).default([1, 2, 3, 4, 5]),
    })
    .prefault({}),
  metronomeBpm: z.number().int().min(30).max(240).default(90),
})

export type Settings = z.infer<typeof settingsSchema>

