import { describe, it, expect } from 'vitest'
import { storeSchema } from '@/lib/validators/store'

describe('storeSchema', () => {
    it('accepts a valid store name', () => {
        const result = storeSchema.safeParse({ name: 'Walmart' })
        expect(result.success).toBe(true)
    })

    it('trims whitespace', () => {
        const result = storeSchema.safeParse({ name: '  Costco  ' })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.name).toBe('Costco')
        }
    })

    it('rejects empty name', () => {
        const result = storeSchema.safeParse({ name: '' })
        expect(result.success).toBe(false)
    })

    it('rejects whitespace-only name', () => {
        const result = storeSchema.safeParse({ name: '   ' })
        expect(result.success).toBe(false)
    })

    it('rejects name over 50 characters', () => {
        const result = storeSchema.safeParse({ name: 'a'.repeat(51) })
        expect(result.success).toBe(false)
    })

    it('accepts name at exactly 50 characters', () => {
        const result = storeSchema.safeParse({ name: 'a'.repeat(50) })
        expect(result.success).toBe(true)
    })

    it('rejects missing name', () => {
        const result = storeSchema.safeParse({})
        expect(result.success).toBe(false)
    })

    it('accepts special characters in store name', () => {
        const result = storeSchema.safeParse({ name: "Trader Joe's" })
        expect(result.success).toBe(true)
    })
})
