import { describe, it, expect } from 'vitest'
import { itemSchema } from '@/lib/validators/item'

describe('itemSchema', () => {
    it('accepts a valid item with only name', () => {
        const result = itemSchema.safeParse({ name: 'Milk' })
        expect(result.success).toBe(true)
    })

    it('accepts a valid item with all fields', () => {
        const result = itemSchema.safeParse({
            name: 'Milk',
            quantity: '2 gallons',
            notes: 'Whole milk please',
            category_id: 1,
        })
        expect(result.success).toBe(true)
    })

    it('accepts null for optional fields', () => {
        const result = itemSchema.safeParse({
            name: 'Eggs',
            quantity: null,
            notes: null,
            category_id: null,
        })
        expect(result.success).toBe(true)
    })

    it('trims whitespace from name', () => {
        const result = itemSchema.safeParse({ name: '  Milk  ' })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.name).toBe('Milk')
        }
    })

    it('trims whitespace from quantity', () => {
        const result = itemSchema.safeParse({ name: 'Milk', quantity: '  2 gallons  ' })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.quantity).toBe('2 gallons')
        }
    })

    it('trims whitespace from notes', () => {
        const result = itemSchema.safeParse({ name: 'Milk', notes: '  Whole  ' })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.notes).toBe('Whole')
        }
    })

    it('rejects empty name', () => {
        const result = itemSchema.safeParse({ name: '' })
        expect(result.success).toBe(false)
    })

    it('rejects whitespace-only name', () => {
        const result = itemSchema.safeParse({ name: '   ' })
        expect(result.success).toBe(false)
    })

    it('rejects name over 100 characters', () => {
        const result = itemSchema.safeParse({ name: 'a'.repeat(101) })
        expect(result.success).toBe(false)
    })

    it('accepts name at exactly 100 characters', () => {
        const result = itemSchema.safeParse({ name: 'a'.repeat(100) })
        expect(result.success).toBe(true)
    })

    it('rejects quantity over 50 characters', () => {
        const result = itemSchema.safeParse({
            name: 'Milk',
            quantity: 'a'.repeat(51),
        })
        expect(result.success).toBe(false)
    })

    it('rejects notes over 200 characters', () => {
        const result = itemSchema.safeParse({
            name: 'Milk',
            notes: 'a'.repeat(201),
        })
        expect(result.success).toBe(false)
    })

    it('rejects non-integer category_id', () => {
        const result = itemSchema.safeParse({
            name: 'Milk',
            category_id: 1.5,
        })
        expect(result.success).toBe(false)
    })

    it('rejects negative category_id', () => {
        const result = itemSchema.safeParse({
            name: 'Milk',
            category_id: -1,
        })
        expect(result.success).toBe(false)
    })

    it('rejects zero category_id', () => {
        const result = itemSchema.safeParse({
            name: 'Milk',
            category_id: 0,
        })
        expect(result.success).toBe(false)
    })

    it('rejects missing name entirely', () => {
        const result = itemSchema.safeParse({})
        expect(result.success).toBe(false)
    })
})
