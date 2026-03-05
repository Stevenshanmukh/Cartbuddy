'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/**
 * Log an activity to the activity_logs table.
 * Fire-and-forget — does not throw on failure.
 */
async function logActivity(
    supabase: ReturnType<typeof createClient>,
    householdId: string,
    action: string,
    metadata?: Record<string, string | number | boolean | null | undefined>
) {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase.from('activity_logs').insert({
            household_id: householdId,
            user_id: user.id,
            action,
            item_name: metadata?.item_name || null,
            store_name: metadata?.store_name || null,
            metadata,
        })
    } catch {
        // Fire and forget
    }
}

export function useItems(storeId: string, householdId?: string, storeName?: string) {
    const supabase = createClient()
    const queryClient = useQueryClient()

    const itemsQuery = useQuery({
        queryKey: ['items', storeId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('items')
                .select('*, profiles:created_by(name)')
                .eq('store_id', storeId)
                .neq('status', 'archived')
                .order('created_at', { ascending: true })

            // If the join fails (RLS), fetch items without profile join
            if (error) {
                const { data: plainData, error: plainError } = await supabase
                    .from('items')
                    .select('*')
                    .eq('store_id', storeId)
                    .neq('status', 'archived')
                    .order('created_at', { ascending: true })

                if (plainError) throw plainError
                return plainData || []
            }

            return data || []
        },
        staleTime: 30 * 1000,
    })

    const addItem = useMutation({
        mutationFn: async (item: {
            name: string
            quantity?: string
            notes?: string
            category_id?: number | null
        }) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('items')
                .insert({
                    store_id: storeId,
                    name: item.name.trim(),
                    quantity: item.quantity?.trim() || null,
                    notes: item.notes?.trim() || null,
                    category_id: item.category_id || null,
                    created_by: user.id,
                })
                .select()
                .single()

            if (error) throw error

            // Log activity
            if (householdId) {
                logActivity(supabase, householdId, 'item_added', {
                    item_name: item.name.trim(),
                    store_name: storeName,
                })
            }

            return data
        },
        onMutate: async (newItem) => {
            await queryClient.cancelQueries({ queryKey: ['items', storeId] })
            const prev = queryClient.getQueryData(['items', storeId])

            queryClient.setQueryData(['items', storeId], (old: any[] = []) => [
                ...old,
                {
                    // Generate a fake ID for the optimistic item
                    id: `temp-${Date.now()}`,
                    store_id: storeId,
                    name: newItem.name.trim(),
                    quantity: newItem.quantity?.trim() || null,
                    notes: newItem.notes?.trim() || null,
                    category_id: newItem.category_id || null,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    // A real created_by name won't be easily available here, but we can fake it or omit it
                    profiles: null,
                }
            ])

            return { prev }
        },
        onError: (_err, _newItem, context) => {
            queryClient.setQueryData(['items', storeId], context?.prev)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['items', storeId] })
        },
    })

    const updateItem = useMutation({
        mutationFn: async ({ id, ...updates }: {
            id: string
            name?: string
            quantity?: string
            notes?: string
            category_id?: number | null
            status?: string
        }) => {
            const { data, error } = await supabase
                .from('items')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onMutate: async (updates) => {
            await queryClient.cancelQueries({ queryKey: ['items', storeId] })
            const prev = queryClient.getQueryData(['items', storeId])

            queryClient.setQueryData(['items', storeId], (old: any[] = []) =>
                old.map(item =>
                    item.id === updates.id ? { ...item, ...updates } : item
                )
            )

            return { prev }
        },
        onError: (_err, _updates, context) => {
            queryClient.setQueryData(['items', storeId], context?.prev)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['items', storeId] })
        },
    })

    const checkItem = useMutation({
        mutationFn: async (itemId: string) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Get item name for activity log
            const items = queryClient.getQueryData(['items', storeId]) as any[] | undefined
            const item = items?.find((i: any) => i.id === itemId)

            const { error } = await supabase
                .from('items')
                .update({
                    status: 'checked',
                    checked_by: user.id,
                    checked_at: new Date().toISOString(),
                })
                .eq('id', itemId)

            if (error) throw error

            if (householdId && item) {
                logActivity(supabase, householdId, 'item_checked', {
                    item_name: item.name,
                    store_name: storeName,
                })
            }
        },
        onMutate: async (itemId) => {
            await queryClient.cancelQueries({ queryKey: ['items', storeId] })
            const prev = queryClient.getQueryData(['items', storeId])

            queryClient.setQueryData(['items', storeId], (old: any[]) =>
                old?.map(item =>
                    item.id === itemId
                        ? { ...item, status: 'checked', checked_at: new Date().toISOString() }
                        : item
                )
            )

            return { prev }
        },
        onError: (_err, _id, context) => {
            queryClient.setQueryData(['items', storeId], context?.prev)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['items', storeId] })
        },
    })

    const uncheckItem = useMutation({
        mutationFn: async (itemId: string) => {
            const { error } = await supabase
                .from('items')
                .update({
                    status: 'active',
                    checked_by: null,
                    checked_at: null,
                })
                .eq('id', itemId)

            if (error) throw error
        },
        onMutate: async (itemId) => {
            await queryClient.cancelQueries({ queryKey: ['items', storeId] })
            const prev = queryClient.getQueryData(['items', storeId])

            queryClient.setQueryData(['items', storeId], (old: any[]) =>
                old?.map(item =>
                    item.id === itemId
                        ? { ...item, status: 'active', checked_by: null, checked_at: null }
                        : item
                )
            )

            return { prev }
        },
        onError: (_err, _id, context) => {
            queryClient.setQueryData(['items', storeId], context?.prev)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['items', storeId] })
        },
    })

    const deleteItem = useMutation({
        mutationFn: async (itemId: string) => {
            // Get item name for activity log before deleting
            const items = queryClient.getQueryData(['items', storeId]) as any[] | undefined
            const item = items?.find((i: any) => i.id === itemId)

            const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', itemId)

            if (error) throw error

            if (householdId && item) {
                logActivity(supabase, householdId, 'item_deleted', {
                    item_name: item.name,
                    store_name: storeName,
                })
            }
        },
        onMutate: async (itemId) => {
            await queryClient.cancelQueries({ queryKey: ['items', storeId] })
            const prev = queryClient.getQueryData(['items', storeId])

            queryClient.setQueryData(['items', storeId], (old: any[]) =>
                old?.filter(item => item.id !== itemId)
            )

            return { prev }
        },
        onError: (_err, _id, context) => {
            queryClient.setQueryData(['items', storeId], context?.prev)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['items', storeId] })
        },
    })

    const archiveChecked = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('items')
                .update({ status: 'archived' })
                .eq('store_id', storeId)
                .eq('status', 'checked')

            if (error) throw error

            if (householdId) {
                logActivity(supabase, householdId, 'items_archived', {
                    store_name: storeName,
                })
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items', storeId] })
        },
    })

    return {
        items: itemsQuery.data || [],
        isLoading: itemsQuery.isLoading,
        error: itemsQuery.error,
        addItem,
        updateItem,
        checkItem,
        uncheckItem,
        deleteItem,
        archiveChecked,
    }
}

export function useCategories() {
    const supabase = createClient()

    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('sort_order', { ascending: true })

            if (error) throw error
            return data || []
        },
        staleTime: Infinity,
    })
}
