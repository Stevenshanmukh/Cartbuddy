import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the supabase client before importing engine
const mockFrom = vi.fn()
const mockSupabase = {
    from: mockFrom,
}

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => mockSupabase,
}))

// Mock the queue module
vi.mock('@/lib/sync/queue', () => {
    let queue: any[] = []
    return {
        getQueuedMutations: vi.fn(() => Promise.resolve([...queue])),
        removeMutation: vi.fn((id: number) => {
            queue = queue.filter(m => m.id !== id)
            return Promise.resolve()
        }),
        updateMutationRetries: vi.fn(() => Promise.resolve()),
        __setQueue: (q: any[]) => { queue = [...q] },
        __getQueue: () => [...queue],
    }
})

import { processQueue } from '@/lib/sync/engine'
import { getQueuedMutations, removeMutation } from '@/lib/sync/queue'

// Access test helpers
const { __setQueue } = await import('@/lib/sync/queue') as any

describe('sync engine', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        __setQueue([])
    })

    it('returns zeros for empty queue', async () => {
        const result = await processQueue()
        expect(result).toEqual({ synced: 0, failed: 0, remaining: 0 })
    })

    it('replays INSERT mutation', async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null })
        mockFrom.mockReturnValue({ insert: mockInsert })

        __setQueue([{
            id: 1,
            table: 'items',
            operation: 'insert',
            data: { name: 'Milk', store_id: 'store-1' },
            timestamp: Date.now(),
            retries: 0,
        }])

        const result = await processQueue()

        expect(mockFrom).toHaveBeenCalledWith('items')
        expect(mockInsert).toHaveBeenCalledWith({ name: 'Milk', store_id: 'store-1' })
        expect(removeMutation).toHaveBeenCalledWith(1)
        expect(result.synced).toBe(1)
    })

    it('replays UPDATE mutation with filter', async () => {
        const mockEq = vi.fn().mockReturnThis()
        mockEq.mockResolvedValueOnce({ error: null })
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
        mockFrom.mockReturnValue({ update: mockUpdate })

        __setQueue([{
            id: 2,
            table: 'items',
            operation: 'update',
            data: { status: 'checked' },
            filter: { id: 'item-abc' },
            timestamp: Date.now(),
            retries: 0,
        }])

        const result = await processQueue()

        expect(mockFrom).toHaveBeenCalledWith('items')
        expect(mockUpdate).toHaveBeenCalledWith({ status: 'checked' })
        expect(result.synced).toBe(1)
    })

    it('replays DELETE mutation with filter', async () => {
        const mockEq = vi.fn().mockReturnThis()
        mockEq.mockResolvedValueOnce({ error: null })
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
        mockFrom.mockReturnValue({ delete: mockDelete })

        __setQueue([{
            id: 3,
            table: 'items',
            operation: 'delete',
            data: {},
            filter: { id: 'item-xyz' },
            timestamp: Date.now(),
            retries: 0,
        }])

        const result = await processQueue()

        expect(mockFrom).toHaveBeenCalledWith('items')
        expect(mockDelete).toHaveBeenCalled()
        expect(result.synced).toBe(1)
    })

    it('drops mutation after MAX_RETRIES (3)', async () => {
        const mockInsert = vi.fn().mockRejectedValue(new Error('Network error'))
        mockFrom.mockReturnValue({ insert: mockInsert })

        __setQueue([{
            id: 4,
            table: 'items',
            operation: 'insert',
            data: { name: 'Fail' },
            timestamp: Date.now(),
            retries: 3, // Already at max
        }])

        const result = await processQueue()

        expect(removeMutation).toHaveBeenCalledWith(4) // Dropped
        expect(result.failed).toBe(1)
        expect(result.synced).toBe(0)
    })

    it('counts failed mutations that have not reached max retries', async () => {
        const mockInsert = vi.fn().mockRejectedValue(new Error('Network error'))
        mockFrom.mockReturnValue({ insert: mockInsert })

        __setQueue([{
            id: 5,
            table: 'items',
            operation: 'insert',
            data: { name: 'RetryMe' },
            timestamp: Date.now(),
            retries: 1, // Below max
        }])

        const result = await processQueue()

        expect(result.failed).toBe(1)
        expect(result.synced).toBe(0)
    })

    it('handles mixed success and failure', async () => {
        let callCount = 0
        mockFrom.mockImplementation(() => ({
            insert: vi.fn().mockImplementation(() => {
                callCount++
                if (callCount === 1) return Promise.resolve({ error: null })
                return Promise.reject(new Error('fail'))
            }),
        }))

        __setQueue([
            {
                id: 10,
                table: 'items',
                operation: 'insert',
                data: { name: 'Success' },
                timestamp: Date.now(),
                retries: 0,
            },
            {
                id: 11,
                table: 'items',
                operation: 'insert',
                data: { name: 'Failure' },
                timestamp: Date.now(),
                retries: 0,
            },
        ])

        const result = await processQueue()

        expect(result.synced).toBe(1)
        expect(result.failed).toBe(1)
    })
})
