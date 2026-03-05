'use client'

import { useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribe to realtime changes on items for a specific store.
 * Merges INSERT/UPDATE/DELETE events directly into the TanStack Query cache.
 */
export function useRealtimeItems(storeId: string) {
    const queryClient = useQueryClient()
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        const channel = supabase
            .channel(`items:${storeId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'items',
                    filter: `store_id=eq.${storeId}`,
                },
                (payload) => {
                    const queryKey = ['items', storeId]

                    if (payload.eventType === 'INSERT') {
                        queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
                            if (!old) return [payload.new]
                            // Avoid duplicates (optimistic update may already have it)
                            const exists = old.some((item: any) => item.id === payload.new.id)
                            if (exists) {
                                return old.map((item: any) =>
                                    item.id === payload.new.id ? { ...item, ...payload.new } : item
                                )
                            }
                            return [...old, payload.new]
                        })
                    }

                    if (payload.eventType === 'UPDATE') {
                        queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
                            if (!old) return old
                            return old.map((item: any) =>
                                item.id === payload.new.id ? { ...item, ...payload.new } : item
                            ).filter((item: any) => item.status !== 'archived')
                        })
                    }

                    if (payload.eventType === 'DELETE') {
                        queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
                            if (!old) return old
                            return old.filter((item: any) => item.id !== payload.old.id)
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [storeId, queryClient, supabase])
}

/**
 * Subscribe to realtime changes on stores for a household.
 * Invalidates the stores query on any change.
 */
export function useRealtimeStores(householdId: string) {
    const queryClient = useQueryClient()
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        const channel = supabase
            .channel(`stores:${householdId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'stores',
                    filter: `household_id=eq.${householdId}`,
                },
                () => {
                    // Simple invalidation for stores — they change less frequently
                    queryClient.invalidateQueries({ queryKey: ['stores', householdId] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [householdId, queryClient, supabase])
}

/**
 * Subscribe to activity log inserts for live activity feed updates.
 */
export function useRealtimeActivity(householdId: string) {
    const queryClient = useQueryClient()
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        const channel = supabase
            .channel(`activity:${householdId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_logs',
                    filter: `household_id=eq.${householdId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['activity', householdId] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [householdId, queryClient, supabase])
}
