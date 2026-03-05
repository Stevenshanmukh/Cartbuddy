'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PresenceState {
    userId: string
    userName: string
    status: 'online' | 'shopping'
    shoppingStoreId?: string | null
    lastSeen: string
}

export function usePresence(householdId: string, userId: string, userName: string) {
    const supabase = useMemo(() => createClient(), [])
    const [onlineMembers, setOnlineMembers] = useState<PresenceState[]>([])
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    useEffect(() => {
        const channel = supabase.channel(`presence:${householdId}`, {
            config: { presence: { key: userId } },
        })

        channelRef.current = channel

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                const members: PresenceState[] = []

                Object.entries(state).forEach(([_key, presences]) => {
                    const presence = (presences as any[])[0]
                    if (presence) {
                        members.push({
                            userId: presence.userId || _key,
                            userName: presence.userName || 'Unknown',
                            status: presence.status || 'online',
                            shoppingStoreId: presence.shoppingStoreId || null,
                            lastSeen: presence.lastSeen || new Date().toISOString(),
                        })
                    }
                })

                setOnlineMembers(members)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        userId,
                        userName,
                        status: 'online',
                        shoppingStoreId: null,
                        lastSeen: new Date().toISOString(),
                    })
                }
            })

        return () => {
            channelRef.current = null
            supabase.removeChannel(channel)
        }
    }, [householdId, userId, userName, supabase])

    const startShopping = useCallback(async (storeId: string) => {
        if (!channelRef.current) return
        await channelRef.current.track({
            userId,
            userName,
            status: 'shopping',
            shoppingStoreId: storeId,
            lastSeen: new Date().toISOString(),
        })
    }, [userId, userName])

    const stopShopping = useCallback(async () => {
        if (!channelRef.current) return
        await channelRef.current.track({
            userId,
            userName,
            status: 'online',
            shoppingStoreId: null,
            lastSeen: new Date().toISOString(),
        })
    }, [userId, userName])

    return {
        onlineMembers,
        onlineCount: onlineMembers.length,
        shoppingMembers: onlineMembers.filter(m => m.status === 'shopping'),
        startShopping,
        stopShopping,
    }
}
