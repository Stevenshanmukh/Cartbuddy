'use client'

import { useState, useEffect, useCallback } from 'react'
import { processQueue } from '@/lib/sync/engine'
import { getPendingCount } from '@/lib/sync/queue'

export function useOffline() {
    const [isOnline, setIsOnline] = useState(true)
    const [pendingCount, setPendingCount] = useState(0)
    const [isSyncing, setIsSyncing] = useState(false)

    // Track online/offline status
    useEffect(() => {
        // Set initial state safely (SSR guard)
        if (typeof navigator !== 'undefined') {
            setIsOnline(navigator.onLine)
        }

        const handleOnline = () => {
            setIsOnline(true)
            // Auto-sync when coming back online
            syncQueue()
        }

        const handleOffline = () => {
            setIsOnline(false)
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // Check pending count periodically
    useEffect(() => {
        const checkPending = async () => {
            try {
                const count = await getPendingCount()
                setPendingCount(count)
            } catch {
                // IndexedDB not available
            }
        }

        checkPending()
        const interval = setInterval(checkPending, 5000)
        return () => clearInterval(interval)
    }, [])

    const syncQueue = useCallback(async () => {
        if (isSyncing || !isOnline) return

        setIsSyncing(true)
        try {
            const result = await processQueue()
            const count = await getPendingCount()
            setPendingCount(count)

            if (result.synced > 0) {
                console.log(`[Sync] Synced ${result.synced} mutations`)
            }
        } catch (error) {
            console.error('[Sync] Queue processing failed:', error)
        } finally {
            setIsSyncing(false)
        }
    }, [isSyncing, isOnline])

    return {
        isOnline,
        pendingCount,
        isSyncing,
        syncQueue,
    }
}
