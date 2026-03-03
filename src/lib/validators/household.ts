import { z } from 'zod'

export const householdSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Household name is required')
        .max(50, 'Household name must be under 50 characters'),
})

export const joinHouseholdSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Your name is required')
        .max(30, 'Name must be under 30 characters'),
})

export type HouseholdFormData = z.infer<typeof householdSchema>
export type JoinHouseholdFormData = z.infer<typeof joinHouseholdSchema>
