import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuthGetUser = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockNeq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()

let builderResult: any = { data: null, error: null }

const mockQueryBuilder: any = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    neq: mockNeq,
    order: mockOrder,
    single: mockSingle,
    then: (resolve: any) => Promise.resolve(builderResult).then(resolve),
}

mockSelect.mockReturnValue(mockQueryBuilder)
mockInsert.mockReturnValue(mockQueryBuilder)
mockUpdate.mockReturnValue(mockQueryBuilder)
mockDelete.mockReturnValue(mockQueryBuilder)
mockEq.mockReturnValue(mockQueryBuilder)
mockNeq.mockReturnValue(mockQueryBuilder)
mockOrder.mockReturnValue(mockQueryBuilder)
mockSingle.mockImplementation(() => Promise.resolve(builderResult))

const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
}))

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        auth: { getUser: mockAuthGetUser },
        from: mockFrom,
    }),
}))

import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useItems } from '@/hooks/use-items'
import React from 'react'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
    },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient} >
        {children}
    </QueryClientProvider>
)

describe('useItems', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        queryClient.clear()

        // Reset default mock returns
        builderResult = { data: { id: '1' }, error: null }
        mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
        mockQueryBuilder.then = (resolve: any) => Promise.resolve(builderResult).then(resolve)
    })

    it('fetches items successfully', async () => {
        const mockItems = [{ id: '1', name: 'Milk' }, { id: '2', name: 'Eggs' }]
        builderResult = { data: mockItems, error: null }

        const { result } = renderHook(() => useItems('store-1'), { wrapper })

        // wait for query to resolve
        await vi.waitUntil(() => !result.current.isLoading)

        expect(result.current.items).toEqual(mockItems)
        expect(mockFrom).toHaveBeenCalledWith('items')
        expect(mockEq).toHaveBeenCalledWith('store_id', 'store-1')
    })

    it('falls back to plain select if join fails', async () => {
        const mockItems = [{ id: '1', name: 'Milk' }]

        // First call with join fails, second call succeeds
        let callCount = 0
        mockQueryBuilder.then = (resolve: any) => {
            callCount++
            if (callCount === 1) {
                return Promise.resolve({ data: null, error: new Error('RLS Error') }).then(resolve)
            }
            return Promise.resolve({ data: mockItems, error: null }).then(resolve)
        }

        const { result } = renderHook(() => useItems('store-1'), { wrapper })

        await vi.waitUntil(() => !result.current.isLoading)

        expect(result.current.items).toEqual(mockItems)
        expect(mockSelect).toHaveBeenCalledWith('*, profiles:created_by(name)')
        expect(mockSelect).toHaveBeenCalledWith('*') // Fallback
    })

    it('adds an item successfully', async () => {
        const { result } = renderHook(() => useItems('store-1'), { wrapper })

        await act(async () => {
            await result.current.addItem.mutateAsync({ name: '  Milk  ' })
        })

        expect(mockInsert).toHaveBeenCalledWith({
            store_id: 'store-1',
            name: 'Milk', // Trimmed
            quantity: null,
            notes: null,
            category_id: null,
            created_by: 'user-1',
        })
    })

    it('optimistically checks an item', async () => {
        // Mock query client data manually since the hook hasn't fetched it yet
        queryClient.setQueryData(['items', 'store-1'], [
            { id: 'item-1', name: 'Milk', status: 'active' }
        ])

        // Defer Supabase resolution
        let resolveSupabase: (value: any) => void
        const deferredPromise = new Promise(resolve => {
            resolveSupabase = resolve
        })
        mockQueryBuilder.then = (resolve: any) => deferredPromise.then(() => resolve(builderResult))

        const { result } = renderHook(() => useItems('store-1'), { wrapper })

        let promise: Promise<void>
        await act(async () => {
            // We do NOT await mutateAsync inside act because it doesn't resolve until we tell it to.
            // We use mutate() so we don't block act.
            result.current.checkItem.mutate('item-1')
            // Wait a tick to let the async onMutate finish
            await new Promise(r => setTimeout(r, 0))
        })

        // Check optimistic state before query resolves
        const items = queryClient.getQueryData(['items', 'store-1']) as any[]
        expect(items[0].status).toBe('checked')
        expect(items[0].checked_at).toBeDefined()

        // Now resolve the mock Supabase to finish the mutation
        await act(async () => {
            resolveSupabase!(null)
        })

        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            status: 'checked',
            checked_by: 'user-1',
        }))
        expect(mockEq).toHaveBeenCalledWith('id', 'item-1')
    })

    it('rolls back check on error', async () => {
        queryClient.setQueryData(['items', 'store-1'], [
            { id: 'item-1', name: 'Milk', status: 'active' }
        ])

        // Mock failure
        mockQueryBuilder.then = (resolve: any) => Promise.resolve({ error: new Error('Network error') }).then(resolve)

        const { result } = renderHook(() => useItems('store-1'), { wrapper })

        await act(async () => {
            try {
                await result.current.checkItem.mutateAsync('item-1')
            } catch (e) {
                // Expected
            }
        })

        // Should be rolled back
        const items = queryClient.getQueryData(['items', 'store-1']) as any[]
        expect(items[0].status).toBe('active')
    })

    it('optimistically deletes an item', async () => {
        queryClient.setQueryData(['items', 'store-1'], [
            { id: 'item-1', name: 'Milk' },
            { id: 'item-2', name: 'Eggs' }
        ])

        // Defer Supabase resolution
        let resolveSupabase: (value: any) => void
        const deferredPromise = new Promise(resolve => {
            resolveSupabase = resolve
        })
        mockQueryBuilder.then = (resolve: any) => deferredPromise.then(() => resolve(builderResult))

        const { result } = renderHook(() => useItems('store-1'), { wrapper })

        await act(async () => {
            result.current.deleteItem.mutate('item-1')
            await new Promise(r => setTimeout(r, 0))
        })

        // Optimistic check
        const items = queryClient.getQueryData(['items', 'store-1']) as any[]
        expect(items).toHaveLength(1)
        expect(items[0].id).toBe('item-2')

        // Resolve!
        await act(async () => {
            resolveSupabase!(null)
        })

        expect(mockDelete).toHaveBeenCalled()
        expect(mockEq).toHaveBeenCalledWith('id', 'item-1')
    })
})
