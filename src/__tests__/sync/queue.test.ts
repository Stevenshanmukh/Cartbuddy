import { describe, it, expect, beforeEach } from 'vitest'
import { queueMutation, getQueuedMutations, removeMutation, getPendingCount, clearQueue, updateMutationRetries } from '@/lib/sync/queue'

// fake-indexeddb is loaded via setup.ts

describe('Sync Queue (IndexedDB)', () => {
    beforeEach(async () => {
        await clearQueue()
    })

    it('starts with empty queue', async () => {
        const mutations = await getQueuedMutations()
        expect(mutations).toHaveLength(0)
    })

    it('queues a mutation', async () => {
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'Milk' },
            timestamp: Date.now(),
            retries: 0,
        })

        const mutations = await getQueuedMutations()
        expect(mutations).toHaveLength(1)
        expect(mutations[0].table).toBe('items')
        expect(mutations[0].operation).toBe('insert')
        expect(mutations[0].data.name).toBe('Milk')
    })

    it('queues multiple mutations in FIFO order', async () => {
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'First' },
            timestamp: 1,
            retries: 0,
        })
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'Second' },
            timestamp: 2,
            retries: 0,
        })

        const mutations = await getQueuedMutations()
        expect(mutations).toHaveLength(2)
        expect(mutations[0].data.name).toBe('First')
        expect(mutations[1].data.name).toBe('Second')
    })

    it('removes a mutation by id', async () => {
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'Test' },
            timestamp: Date.now(),
            retries: 0,
        })

        const mutations = await getQueuedMutations()
        expect(mutations).toHaveLength(1)

        await removeMutation(mutations[0].id!)
        const remaining = await getQueuedMutations()
        expect(remaining).toHaveLength(0)
    })

    it('counts pending mutations', async () => {
        expect(await getPendingCount()).toBe(0)

        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'A' },
            timestamp: Date.now(),
            retries: 0,
        })
        expect(await getPendingCount()).toBe(1)

        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'B' },
            timestamp: Date.now(),
            retries: 0,
        })
        expect(await getPendingCount()).toBe(2)
    })

    it('clears all mutations', async () => {
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
        expect(await getPendingCount()).toBe(0)
    })

    it('updates retry count for a mutation', async () => {
        await queueMutation({
            table: 'items',
            operation: 'insert',
            data: { name: 'Retry Test' },
            timestamp: Date.now(),
            retries: 0,
        })

        const mutations = await getQueuedMutations()
        expect(mutations[0].retries).toBe(0)

        await updateMutationRetries(mutations[0].id!, 2)
        const updated = await getQueuedMutations()
        expect(updated[0].retries).toBe(2)
    })

    it('supports update operations with filters', async () => {
        await queueMutation({
            table: 'items',
            operation: 'update',
            data: { name: 'Updated Milk' },
            filter: { id: 'item-123' },
            timestamp: Date.now(),
            retries: 0,
        })

        const mutations = await getQueuedMutations()
        expect(mutations[0].operation).toBe('update')
        expect(mutations[0].filter).toEqual({ id: 'item-123' })
    })

    it('supports delete operations with filters', async () => {
        await queueMutation({
            table: 'items',
            operation: 'delete',
            data: {},
            filter: { id: 'item-456' },
            timestamp: Date.now(),
            retries: 0,
        })

        const mutations = await getQueuedMutations()
        expect(mutations[0].operation).toBe('delete')
        expect(mutations[0].filter).toEqual({ id: 'item-456' })
    })
})
