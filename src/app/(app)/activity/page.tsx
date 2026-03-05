'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useHousehold } from '@/contexts/household-context'
import { useRealtimeActivity } from '@/hooks/use-realtime'
import { timeAgo } from '@/lib/utils'

const actionLabels: Record<string, (a: any) => string> = {
    item_added: (a) => `added "${a?.item_name || a?.metadata?.item_name || 'an item'}"`,
    item_checked: (a) => `checked off "${a?.item_name || a?.metadata?.item_name || 'an item'}"`,
    item_unchecked: (a) => `unchecked "${a?.item_name || a?.metadata?.item_name || 'an item'}"`,
    item_deleted: (a) => `removed "${a?.item_name || a?.metadata?.item_name || 'an item'}"`,
    item_edited: (a) => `edited "${a?.item_name || a?.metadata?.item_name || 'an item'}"`,
    items_archived: (a) => `archived checked items${a?.store_name || a?.metadata?.store_name ? ` at ${a.store_name || a.metadata.store_name}` : ''}`,
    store_created: (a) => `created "${a?.store_name || a?.metadata?.store_name || 'a store'}"`,
    store_deleted: (a) => `deleted "${a?.store_name || a?.metadata?.store_name || 'a store'}"`,
    member_joined: () => `joined the household`,
    member_left: () => `left the household`,
    shopping_started: (a) => `started shopping at "${a?.store_name || a?.metadata?.store_name || 'a store'}"`,
    shopping_ended: () => `finished shopping`,
}

export default function ActivityPage() {
    const { activeHouseholdId } = useHousehold()
    const supabase = useMemo(() => createClient(), [])

    useRealtimeActivity(activeHouseholdId || '')

    const { data: activities, isLoading } = useQuery({
        queryKey: ['activity', activeHouseholdId],
        queryFn: async () => {
            if (!activeHouseholdId) return []

            const { data, error } = await supabase
                .from('activity_logs')
                .select('*, profiles:user_id(name)')
                .eq('household_id', activeHouseholdId)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            return data
        },
        enabled: !!activeHouseholdId,
    })

    return (
        <div className="px-4 py-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Activity</h2>

            {isLoading ? (
                <div className="space-y-4 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 rounded w-1/4" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (!activities || activities.length === 0) ? (
                <div className="text-center py-16 text-gray-500">
                    <p>No activity yet.</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {activities.map((activity) => {
                        // Support both single object and array return forms from Supabase join
                        const profilesData = Array.isArray(activity.profiles) ? activity.profiles[0] : activity.profiles
                        const userName = profilesData?.name || 'Someone'
                        const actionFn = actionLabels[activity.action]
                        const label = actionFn ? actionFn(activity) : activity.action

                        return (
                            <div
                                key={activity.id}
                                className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
                            >
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold text-blue-600 mt-0.5">
                                    {userName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900">
                                        <span className="font-medium">{userName}</span>{' '}
                                        <span className="text-gray-600">{label}</span>
                                    </p>
                                    {activity.store_name && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            at {activity.store_name}
                                        </p>
                                    )}
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap mt-0.5">
                                    {timeAgo(activity.created_at)}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
