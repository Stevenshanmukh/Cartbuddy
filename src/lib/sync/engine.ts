/**
 * Sync engine: replays queued mutations when the app comes back online.
 * Uses Last-Write-Wins (LWW) conflict resolution for MVP.
 */

import { createClient } from '@/lib/supabase/client'
import { getQueuedMutations, removeMutation, type QueuedMutation } from './queue'

const MAX_RETRIES = 3

/**
 * Process all queued mutations in FIFO order.
 * Returns the number of successfully synced operations.
 */
export async function processQueue(): Promise<{
    synced: number
    failed: number
    remaining: number
}> {
    const supabase = createClient()
    const mutations = await getQueuedMutations()

    let synced = 0
    let failed = 0

    for (const mutation of mutations) {
        try {
            await replayMutation(supabase, mutation)
            await removeMutation(mutation.id!)
            synced++
        } catch (error) {
            console.error(`[Sync] Failed to replay mutation ${mutation.id}:`, error)

            if (mutation.retries >= MAX_RETRIES) {
                // Give up after max retries — remove from queue
                await removeMutation(mutation.id!)
                failed++
                console.warn(`[Sync] Dropped mutation ${mutation.id} after ${MAX_RETRIES} retries`)
            } else {
                failed++
            }
        }
    }

    const remaining = mutations.length - synced - failed
    return { synced, failed, remaining }
}

/**
 * Replay a single mutation against Supabase.
 */
async function replayMutation(supabase: any, mutation: QueuedMutation): Promise<void> {
    const { table, operation, data, filter } = mutation

    switch (operation) {
        case 'insert': {
            const { error } = await supabase.from(table).insert(data)
            if (error) throw error
            break
        }
        case 'update': {
            let query = supabase.from(table).update(data)
            if (filter) {
                Object.entries(filter).forEach(([key, value]) => {
                    query = query.eq(key, value)
                })
            }
            const { error } = await query
            if (error) throw error
            break
        }
        case 'delete': {
            let query = supabase.from(table).delete()
            if (filter) {
                Object.entries(filter).forEach(([key, value]) => {
                    query = query.eq(key, value)
                })
            }
            const { error } = await query
            if (error) throw error
            break
        }
    }
}
