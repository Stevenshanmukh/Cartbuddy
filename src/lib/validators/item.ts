import { z } from 'zod'

export const itemSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Item name is required')
        .max(100, 'Item name must be under 100 characters'),
    quantity: z
        .string()
        .trim()
        .max(50, 'Quantity must be under 50 characters')
        .optional()
        .nullable(),
    notes: z
        .string()
        .trim()
        .max(200, 'Notes must be under 200 characters')
        .optional()
        .nullable(),
    category_id: z.number().int().positive().optional().nullable(),
})

export type ItemFormData = z.infer<typeof itemSchema>
