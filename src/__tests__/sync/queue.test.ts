import { describe, it, expect, beforeEach } from 'vitest'
import {
    queueMutation,
    getQueuedMutations,
    removeMutation,
    getPendingCount,
    clearQueue,
    type QueuedMutation,
} from '@/lib/sync/queue'

// fake-indexeddb is polyfilled in setup.ts

describe('sync queue (IndexedDB)', () => {
    beforeEach(async () => {
        await clearQueue()
    })

    it('starts with empty queue', async () => {
        const mutations = await getQueuedMutations()
        expect(mutations).toEqual([])
    })

    it('getPendingCount returns 0 for empty queue', async () => {
        const count = await getPendingCount()
        expect(count).toBe(0)
    })

    it('queues a mutation and retrieves it', async () => {
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'Milk', store_id: 'store-1' },
            timestamp: Date.now(),
            retries: 0,
        })

        const mutations = await getQueuedMutations()
        expect(mutations).toHaveLength(1)
        expect(mutations[0].table).toBe('items')
        expect(mutations[0].operation).toBe('insert')
        expect(mutations[0].data.name).toBe('Milk')
    })

    it('auto-assigns an id to queued mutations', async () => {
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'Eggs' },
            timestamp: Date.now(),
            retries: 0,
        })

        const mutations = await getQueuedMutations()
        expect(mutations[0].id).toBeDefined()
        expect(typeof mutations[0].id).toBe('number')
    })

    it('maintains FIFO order', async () => {
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'First' },
            timestamp: 1000,
            retries: 0,
        })
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'Second' },
            timestamp: 2000,
            retries: 0,
        })
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'Third' },
            timestamp: 3000,
            retries: 0,
        })

        const mutations = await getQueuedMutations()
        expect(mutations).toHaveLength(3)
        expect(mutations[0].data.name).toBe('First')
        expect(mutations[1].data.name).toBe('Second')
        expect(mutations[2].data.name).toBe('Third')
    })

    it('getPendingCount reflects queue size', async () => {
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'A' },
            timestamp: Date.now(),
            retries: 0,
        })
        await queueMutation({
            table: 'items',
            operation: 'update',
            data: { status: 'checked' },
            filter: { id: 'item-1' },
            timestamp: Date.now(),
            retries: 0,
        })

        const count = await getPendingCount()
        expect(count).toBe(2)
    })

    it('removeMutation removes specific mutation', async () => {
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'Keep' },
            timestamp: Date.now(),
            retries: 0,
        })
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'Remove' },
            timestamp: Date.now(),
            retries: 0,
        })

        const before = await getQueuedMutations()
        const removeId = before.find(m => m.data.name === 'Remove')!.id!
        await removeMutation(removeId)

        const after = await getQueuedMutations()
        expect(after).toHaveLength(1)
        expect(after[0].data.name).toBe('Keep')
    })

    it('clearQueue removes all mutations', async () => {
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'A' },
            timestamp: Date.now(),
            retries: 0,
        })
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'B' },
            timestamp: Date.now(),
            retries: 0,
        })

        await clearQueue()

        const count = await getPendingCount()
        expect(count).toBe(0)
        const mutations = await getQueuedMutations()
        expect(mutations).toEqual([])
    })

    it('stores filter data for update mutations', async () => {
        await queueMutation({
            table: 'items',
            operation: 'update',
            data: { status: 'checked' },
            filter: { id: 'item-123', store_id: 'store-456' },
            timestamp: Date.now(),
            retries: 0,
        })

        const mutations = await getQueuedMutations()
        expect(mutations[0].filter).toEqual({
            id: 'item-123',
            store_id: 'store-456',
        })
    })

    it('stores filter data for delete mutations', async () => {
        await queueMutation({
            table: 'items',
            operation: 'delete',
            data: {},
            filter: { id: 'item-789' },
            timestamp: Date.now(),
            retries: 0,
        })

        const mutations = await getQueuedMutations()
        expect(mutations[0].operation).toBe('delete')
        expect(mutations[0].filter).toEqual({ id: 'item-789' })
    })
})
