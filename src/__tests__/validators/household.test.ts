import { describe, it, expect } from 'vitest'
import { householdSchema, joinHouseholdSchema } from '@/lib/validators/household'

describe('householdSchema', () => {
    it('accepts a valid household name', () => {
        const result = householdSchema.safeParse({ name: 'Apt 4B' })
        expect(result.success).toBe(true)
    })

    it('trims whitespace', () => {
        const result = householdSchema.safeParse({ name: '  Apt 4B  ' })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.name).toBe('Apt 4B')
        }
    })

    it('rejects empty name', () => {
        const result = householdSchema.safeParse({ name: '' })
        expect(result.success).toBe(false)
    })

    it('rejects whitespace-only name', () => {
        const result = householdSchema.safeParse({ name: '   ' })
        expect(result.success).toBe(false)
    })

    it('rejects name over 50 characters', () => {
        const result = householdSchema.safeParse({ name: 'a'.repeat(51) })
        expect(result.success).toBe(false)
    })

    it('accepts name at exactly 50 characters', () => {
        const result = householdSchema.safeParse({ name: 'a'.repeat(50) })
        expect(result.success).toBe(true)
    })

    it('rejects missing name', () => {
        const result = householdSchema.safeParse({})
        expect(result.success).toBe(false)
    })
})

describe('joinHouseholdSchema', () => {
    it('accepts a valid name', () => {
        const result = joinHouseholdSchema.safeParse({ name: 'Steve' })
        expect(result.success).toBe(true)
    })

    it('trims whitespace', () => {
        const result = joinHouseholdSchema.safeParse({ name: '  Steve  ' })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.name).toBe('Steve')
        }
    })

    it('rejects empty name', () => {
        const result = joinHouseholdSchema.safeParse({ name: '' })
        expect(result.success).toBe(false)
    })

    it('rejects name over 30 characters', () => {
        const result = joinHouseholdSchema.safeParse({ name: 'a'.repeat(31) })
        expect(result.success).toBe(false)
    })

    it('accepts name at exactly 30 characters', () => {
        const result = joinHouseholdSchema.safeParse({ name: 'a'.repeat(30) })
        expect(result.success).toBe(true)
    })
})
