import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { HouseholdProvider } from '@/contexts/household-context'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import type { HouseholdWithMembership } from '@/lib/types'

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Get user profile — auto-create if missing (email signup doesn't create one)
    let { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()

    if (!profile) {
        const displayName =
            user.user_metadata?.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'User'

        const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                name: displayName,
                avatar_url: user.user_metadata?.avatar_url || null,
            })
            .select('name, avatar_url')
            .single()

        profile = newProfile

        if (!profile) {
            // Profile creation failed — likely RLS issue, redirect to login
            redirect('/login')
        }
    }

    // Get ALL household memberships for this user
    const { data: memberships } = await supabase
        .from('household_members')
        .select('household_id, role, households(id, name, created_by, created_at)')
        .eq('user_id', user.id)

    // If user has no households, redirect to the households dashboard (outside (app))
    if (!memberships || memberships.length === 0) {
        redirect('/households')
    }

    // Build HouseholdWithMembership objects
    const householdIds = memberships.map(m => m.household_id)
    const { data: memberCounts } = await supabase
        .from('household_members')
        .select('household_id')
        .in('household_id', householdIds)

    const countMap: Record<string, number> = {}
    memberCounts?.forEach(mc => {
        countMap[mc.household_id] = (countMap[mc.household_id] || 0) + 1
    })

    const households: HouseholdWithMembership[] = memberships.map(m => {
        const h = (m as any).households
        return {
            id: h.id,
            name: h.name,
            created_by: h.created_by,
            created_at: h.created_at,
            role: m.role as 'owner' | 'admin' | 'member',
            member_count: countMap[m.household_id] || 1,
        }
    })

    return (
        <HouseholdProvider households={households} userId={user.id}>
            <AppShell
                userId={user.id}
                userName={profile.name}
                userEmail={user.email || ''}
                households={households}
            >
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </AppShell>
        </HouseholdProvider>
    )
}
