import { z } from 'zod'

export const storeSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Store name is required')
        .max(50, 'Store name must be under 50 characters'),
})

export type StoreFormData = z.infer<typeof storeSchema>
