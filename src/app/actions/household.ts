'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { householdSchema } from '@/lib/validators/household'

export async function createHousehold(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Server-side Zod validation
    const rawName = (formData.get('householdName') as string) || 'My Household'
    const parsed = householdSchema.safeParse({ name: rawName })
    const householdName = parsed.success ? parsed.data.name : 'My Household'

    // 1. Create household — use .select() with id only
    // RLS INSERT policy allows if created_by = auth.uid()
    // But SELECT policy requires membership, so we use the returned id directly
    const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({ name: householdName, created_by: user.id })
        .select('id')
        .single()

    if (householdError || !household) {
        return { error: `Failed to create household: ${householdError?.message || 'Unknown error'}` }
    }

    // 2. Add as owner member
    const { error: memberError } = await supabase
        .from('household_members')
        .insert({
            household_id: household.id,
            user_id: user.id,
            role: 'owner',
        })

    if (memberError) {
        // Clean up: delete the orphaned household
        await supabase.from('households').delete().eq('id', household.id)
        return { error: `Failed to join household: ${memberError.message}` }
    }

    // 3. Create a default invite for the household
    await supabase.from('invites').insert({
        household_id: household.id,
        created_by: user.id,
    })

    revalidatePath('/households')
    redirect('/households')
}

export async function joinHouseholdByInvite(token: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // 1. Look up invite by token
    const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('id, household_id, expires_at, max_uses, use_count, is_active, households(name)')
        .eq('token', token)
        .single()

    if (inviteError || !invite) {
        return { error: 'Invalid or expired invite link.' }
    }

    // 2. Validate invite
    if (!invite.is_active) {
        return { error: 'This invite has been revoked.' }
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return { error: 'This invite has expired.' }
    }

    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
        return { error: 'This invite has reached its maximum uses.' }
    }

    // 3. Check if already a member
    const { data: existingMembership } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', invite.household_id)
        .eq('user_id', user.id)
        .single()

    if (existingMembership) {
        // Already a member — just redirect
        revalidatePath('/households')
        redirect('/households')
    }

    // 4. Add as member
    const { error: memberError } = await supabase
        .from('household_members')
        .insert({
            household_id: invite.household_id,
            user_id: user.id,
            role: 'member',
        })

    if (memberError) {
        return { error: 'Failed to join household.' }
    }

    // 5. Increment invite use count (atomic to prevent TOCTOU race)
    await supabase.rpc('increment_invite_use_count', { p_invite_id: invite.id })

    // 6. Log activity
    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

    await supabase.from('activity_logs').insert({
        household_id: invite.household_id,
        user_id: user.id,
        action: 'member_joined',
        metadata: { user_name: profile?.name || 'Unknown' },
    })

    revalidatePath('/households')
    redirect('/households')
}

export async function leaveHousehold(householdId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Get membership
    const { data: membership } = await supabase
        .from('household_members')
        .select('id, role')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .single()

    if (!membership) return { error: 'Not in this household' }

    if (membership.role === 'owner') {
        // Check if there are other members
        const { count } = await supabase
            .from('household_members')
            .select('id', { count: 'exact', head: true })
            .eq('household_id', householdId)

        if (count && count > 1) {
            return { error: 'Transfer ownership before leaving. You are the household owner.' }
        }

        // If owner is last member, delete the household
        await supabase
            .from('households')
            .delete()
            .eq('id', householdId)
    } else {
        // Regular member can just leave
        await supabase
            .from('household_members')
            .delete()
            .eq('id', membership.id)
    }

    revalidatePath('/households')
    return { success: true }
}

export async function deleteHousehold(householdId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Verify ownership
    const { data: membership } = await supabase
        .from('household_members')
        .select('role')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .single()

    if (!membership || membership.role !== 'owner') {
        return { error: 'You are not the household owner.' }
    }

    // CASCADE will delete members, stores, items, invites
    const { error } = await supabase
        .from('households')
        .delete()
        .eq('id', householdId)

    if (error) return { error: 'Failed to delete household.' }

    revalidatePath('/households')
    return { success: true }
}

export async function updateMemberRole(householdId: string, userId: string, newRole: 'admin' | 'member') {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Verify caller is owner
    const { data: callerMembership } = await supabase
        .from('household_members')
        .select('role')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .single()

    if (!callerMembership || callerMembership.role !== 'owner') {
        return { error: 'Only the owner can change roles.' }
    }

    const { error } = await supabase
        .from('household_members')
        .update({ role: newRole })
        .eq('household_id', householdId)
        .eq('user_id', userId)

    if (error) return { error: 'Failed to update role.' }

    revalidatePath('/households')
    return { success: true }
}

export async function transferOwnership(householdId: string, newOwnerId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Verify caller is current owner
    const { data: callerMembership } = await supabase
        .from('household_members')
        .select('role')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .single()

    if (!callerMembership || callerMembership.role !== 'owner') {
        return { error: 'Only the owner can transfer ownership.' }
    }

    // Atomic ownership transfer via PostgreSQL transaction
    const { error: rpcError } = await supabase.rpc('transfer_ownership', {
        p_household_id: householdId,
        p_new_owner_id: newOwnerId,
        p_caller_id: user.id,
    })

    if (rpcError) {
        return { error: rpcError.message || 'Failed to transfer ownership.' }
    }

    revalidatePath('/households')
    return { success: true }
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/')
    redirect('/')
}
