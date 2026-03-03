import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

    const { data: membership } = await supabase
        .from('household_members')
        .select('household_id, role, households(id, name, invite_code)')
        .eq('user_id', user.id)
        .single()

    if (!membership || !profile) redirect('/')

    const household = (membership as any).households

    // Get all members
    const { data: members } = await supabase
        .from('household_members')
        .select('user_id, role, joined_at')
        .eq('household_id', household.id)
        .order('joined_at', { ascending: true })

    // Fetch profiles for all members
    const memberUserIds = (members || []).map(m => m.user_id)
    const { data: memberProfiles } = memberUserIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, name')
            .in('id', memberUserIds)
        : { data: [] }

    const profileMap = new Map((memberProfiles || []).map(p => [p.id, p.name]))

    return (
        <SettingsClient
            userName={profile.name}
            householdName={household.name}
            inviteCode={household.invite_code}
            isOwner={membership.role === 'owner'}
            members={(members || []).map((m: any) => ({
                userId: m.user_id,
                name: profileMap.get(m.user_id) || 'Unknown',
                role: m.role,
                joinedAt: m.joined_at,
            }))}
        />
    )
}
