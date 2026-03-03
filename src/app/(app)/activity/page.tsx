import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { timeAgo } from '@/lib/utils'

export default async function ActivityPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single()

    if (!membership) redirect('/')

    // Fetch activity logs
    const { data: activities } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('household_id', membership.household_id)
        .order('created_at', { ascending: false })
        .limit(50)

    // Fetch profiles for activity users
    const userIds = [...new Set((activities || []).map(a => a.user_id))]
    const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, name').in('id', userIds)
        : { data: [] }

    const profileMap = new Map((profiles || []).map(p => [p.id, p.name]))

    const actionLabels: Record<string, (meta: any) => string> = {
        item_added: (m) => `added "${m?.item_name || 'an item'}"`,
        item_checked: (m) => `checked off "${m?.item_name || 'an item'}"`,
        item_unchecked: (m) => `unchecked "${m?.item_name || 'an item'}"`,
        item_deleted: (m) => `removed "${m?.item_name || 'an item'}"`,
        item_edited: (m) => `edited "${m?.item_name || 'an item'}"`,
        items_archived: () => 'archived checked items',
        store_created: (m) => `created "${m?.store_name || 'a store'}"`,
        store_deleted: (m) => `deleted "${m?.store_name || 'a store'}"`,
        member_joined: (m) => `joined the household`,
        member_left: () => `left the household`,
        shopping_started: (m) => `started shopping at "${m?.store_name || 'a store'}"`,
        shopping_ended: () => `finished shopping`,
    }

    return (
        <div className="px-4 py-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Activity</h2>

            {(!activities || activities.length === 0) ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">No activity yet</h3>
                    <p className="text-gray-500 text-sm">Activity will show up once items are added</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {activities.map((activity) => {
                        const userName = profileMap.get(activity.user_id) || 'Someone'
                        const actionFn = actionLabels[activity.action]
                        const label = actionFn ? actionFn(activity.metadata) : activity.action

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
