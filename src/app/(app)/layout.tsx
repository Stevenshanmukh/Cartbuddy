import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Get user profile + household info
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

    return (
        <AppShell
            userId={user.id}
            userName={profile.name}
            householdId={household.id}
            householdName={household.name}
            inviteCode={household.invite_code}
            isOwner={membership.role === 'owner'}
        >
            {children}
        </AppShell>
    )
}
