'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createInvite(
    householdId: string,
    options?: { expiresInHours?: number; maxUses?: number }
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Verify owner/admin
    const { data: membership } = await supabase
        .from('household_members')
        .select('role')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return { error: 'Only owners and admins can create invites.' }
    }

    const expiresAt = options?.expiresInHours
        ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000).toISOString()
        : null

    const { data: invite, error } = await supabase
        .from('invites')
        .insert({
            household_id: householdId,
            created_by: user.id,
            expires_at: expiresAt,
            max_uses: options?.maxUses || null,
        })
        .select()
        .single()

    if (error || !invite) {
        return { error: 'Failed to create invite.' }
    }

    revalidatePath('/settings')
    return { success: true, invite }
}

export async function revokeInvite(inviteId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Fetch invite to get its household_id
    const { data: invite } = await supabase
        .from('invites')
        .select('id, household_id')
        .eq('id', inviteId)
        .single()

    if (!invite) return { error: 'Invite not found.' }

    // Verify caller is owner/admin of the household
    const { data: membership } = await supabase
        .from('household_members')
        .select('role')
        .eq('household_id', invite.household_id)
        .eq('user_id', user.id)
        .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return { error: 'Only owners and admins can revoke invites.' }
    }

    const { error } = await supabase
        .from('invites')
        .update({ is_active: false })
        .eq('id', inviteId)

    if (error) return { error: 'Failed to revoke invite.' }

    revalidatePath('/settings')
    return { success: true }
}

export async function getActiveInvite(householdId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Get the most recent active invite
    const { data: invite } = await supabase
        .from('invites')
        .select('*')
        .eq('household_id', householdId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    return { invite }
}

export async function regenerateInvite(householdId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Revoke all existing invites
    await supabase
        .from('invites')
        .update({ is_active: false })
        .eq('household_id', householdId)

    // Create new invite
    const { data: invite, error } = await supabase
        .from('invites')
        .insert({
            household_id: householdId,
            created_by: user.id,
        })
        .select()
        .single()

    if (error || !invite) {
        return { error: 'Failed to create new invite.' }
    }

    revalidatePath('/settings')
    return { success: true, invite }
}
