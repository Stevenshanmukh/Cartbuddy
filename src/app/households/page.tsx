import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HouseholdsDashboard } from './households-dashboard'

export default async function HouseholdsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

    // Get all memberships with household details
    const { data: memberships } = await supabase
        .from('household_members')
        .select('household_id, role, households(id, name, created_by, created_at)')
        .eq('user_id', user.id)

    // Get member counts
    const householdIds = memberships?.map(m => m.household_id) || []
    const countMap: Record<string, number> = {}

    if (householdIds.length > 0) {
        const { data: memberCounts } = await supabase
            .from('household_members')
            .select('household_id')
            .in('household_id', householdIds)

        memberCounts?.forEach(mc => {
            countMap[mc.household_id] = (countMap[mc.household_id] || 0) + 1
        })
    }

    const households = (memberships || []).map(m => {
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
        <HouseholdsDashboard
            households={households}
            userName={profile?.name || 'User'}
            userEmail={user.email || ''}
        />
    )
}
