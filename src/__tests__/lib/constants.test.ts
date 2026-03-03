import { describe, it, expect } from 'vitest'
import {
    CATEGORIES,
    UNDO_TIMEOUT_MS,
    PRESENCE_HEARTBEAT_MS,
    MIN_TOUCH_TARGET_PX,
    ACTIVITY_FEED_LIMIT,
    ITEM_STATUS,
    MEMBER_ROLE,
    ACTIVITY_ACTION,
} from '@/lib/constants'

describe('CATEGORIES', () => {
    it('has 11 entries', () => {
        expect(CATEGORIES).toHaveLength(11)
    })

    it('has unique IDs', () => {
        const ids = CATEGORIES.map(c => c.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('has unique names', () => {
        const names = CATEGORIES.map(c => c.name)
        expect(new Set(names).size).toBe(names.length)
    })

    it('has "Produce" as first category', () => {
        expect(CATEGORIES[0].name).toBe('Produce')
        expect(CATEGORIES[0].sort_order).toBe(1)
    })

    it('has "Other" as last category', () => {
        const last = CATEGORIES[CATEGORIES.length - 1]
        expect(last.name).toBe('Other')
        expect(last.sort_order).toBe(99)
    })

    it('all entries have id, name, sort_order', () => {
        CATEGORIES.forEach(cat => {
            expect(cat).toHaveProperty('id')
            expect(cat).toHaveProperty('name')
            expect(cat).toHaveProperty('sort_order')
            expect(typeof cat.id).toBe('number')
            expect(typeof cat.name).toBe('string')
            expect(typeof cat.sort_order).toBe('number')
        })
    })
})

describe('configuration constants', () => {
    it('UNDO_TIMEOUT_MS is 5000 (5 seconds)', () => {
        expect(UNDO_TIMEOUT_MS).toBe(5000)
    })

    it('PRESENCE_HEARTBEAT_MS is 15000 (15 seconds)', () => {
        expect(PRESENCE_HEARTBEAT_MS).toBe(15000)
    })

    it('MIN_TOUCH_TARGET_PX is 44', () => {
        expect(MIN_TOUCH_TARGET_PX).toBe(44)
    })

    it('ACTIVITY_FEED_LIMIT is 20', () => {
        expect(ACTIVITY_FEED_LIMIT).toBe(20)
    })
})

describe('ITEM_STATUS', () => {
    it('has active, checked, and archived', () => {
        expect(ITEM_STATUS.ACTIVE).toBe('active')
        expect(ITEM_STATUS.CHECKED).toBe('checked')
        expect(ITEM_STATUS.ARCHIVED).toBe('archived')
    })

    it('has unique values', () => {
        const values = Object.values(ITEM_STATUS)
        expect(new Set(values).size).toBe(values.length)
    })
})

describe('MEMBER_ROLE', () => {
    it('has owner and member', () => {
        expect(MEMBER_ROLE.OWNER).toBe('owner')
        expect(MEMBER_ROLE.MEMBER).toBe('member')
    })
})

describe('ACTIVITY_ACTION', () => {
    it('has all expected actions', () => {
        expect(ACTIVITY_ACTION.ITEM_ADDED).toBe('item_added')
        expect(ACTIVITY_ACTION.ITEM_CHECKED).toBe('item_checked')
        expect(ACTIVITY_ACTION.ITEM_UNCHECKED).toBe('item_unchecked')
        expect(ACTIVITY_ACTION.ITEM_DELETED).toBe('item_deleted')
        expect(ACTIVITY_ACTION.ITEM_EDITED).toBe('item_edited')
        expect(ACTIVITY_ACTION.ITEMS_ARCHIVED).toBe('items_archived')
        expect(ACTIVITY_ACTION.STORE_CREATED).toBe('store_created')
        expect(ACTIVITY_ACTION.STORE_DELETED).toBe('store_deleted')
        expect(ACTIVITY_ACTION.MEMBER_JOINED).toBe('member_joined')
        expect(ACTIVITY_ACTION.MEMBER_LEFT).toBe('member_left')
        expect(ACTIVITY_ACTION.SHOPPING_STARTED).toBe('shopping_started')
        expect(ACTIVITY_ACTION.SHOPPING_ENDED).toBe('shopping_ended')
    })

    it('has unique values', () => {
        const values = Object.values(ACTIVITY_ACTION)
        expect(new Set(values).size).toBe(values.length)
    })

    it('has 12 activity types', () => {
        expect(Object.keys(ACTIVITY_ACTION)).toHaveLength(12)
    })
})
