import { z } from 'zod'

export const repoConfigSchema = z.object({
  context: z
    .object({
      cookies: z
        .array(z.object({ name: z.string(), label: z.string() }))
        .optional(),
      localStorage: z
        .array(z.object({ key: z.string(), label: z.string() }))
        .optional(),
    })
    .optional(),
})
