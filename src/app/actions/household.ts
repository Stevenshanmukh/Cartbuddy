'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createHousehold(formData: FormData) {
    const supabase = await createClient()
    const userName = formData.get('name') as string
    const householdName = (formData.get('householdName') as string) || 'My Household'

    if (!userName?.trim()) {
        return { error: 'Name is required' }
    }

    // 1. Sign in anonymously
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
    if (authError || !authData.user) {
        console.error('Anonymous Auth Error:', authError)
        return { error: 'Failed to create account. Please try again.' }
    }

    const userId = authData.user.id

    // 2. Create profile
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: userId, name: userName.trim() })

    if (profileError) {
        console.error('Profile Creation Error:', profileError)
        return { error: 'Failed to create profile.' }
    }

    // 3. Create household
    const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({ name: householdName.trim(), created_by: userId })
        .select()
        .single()

    if (householdError || !household) {
        console.error('Household Creation Error:', householdError)
        return { error: 'Failed to create household.' }
    }

    // 4. Add as owner member
    const { error: memberError } = await supabase
        .from('household_members')
        .insert({
            household_id: household.id,
            user_id: userId,
            role: 'owner',
        })

    if (memberError) {
        console.error('Member Add Error:', memberError)
        return { error: 'Failed to join household.' }
    }

    revalidatePath('/dashboard')
    redirect('/dashboard')
}

export async function joinHousehold(inviteCode: string, formData: FormData) {
    const supabase = await createClient()
    const userName = formData.get('name') as string

    if (!userName?.trim()) {
        return { error: 'Name is required' }
    }

    // 1. Look up household by invite code
    const { data: household, error: lookupError } = await supabase
        .from('households')
        .select('id, name')
        .eq('invite_code', inviteCode)
        .single()

    if (lookupError || !household) {
        return { error: 'Invalid or expired invite link.' }
    }

    // 2. Sign in anonymously
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
    if (authError || !authData.user) {
        console.error('Anonymous Auth Error (Join):', authError)
        return { error: 'Failed to create account. Please try again.' }
    }

    const userId = authData.user.id

    // 3. Create profile
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: userId, name: userName.trim() })

    if (profileError) {
        return { error: 'Failed to create profile.' }
    }

    // 4. Add as member
    const { error: memberError } = await supabase
        .from('household_members')
        .insert({
            household_id: household.id,
            user_id: userId,
            role: 'member',
        })

    if (memberError) {
        if (memberError.code === '23505') {
            return { error: 'You are already a member of this household.' }
        }
        return { error: 'Failed to join household.' }
    }

    // 5. Log activity
    await supabase.from('activity_logs').insert({
        household_id: household.id,
        user_id: userId,
        action: 'member_joined',
        metadata: { user_name: userName.trim() },
    })

    revalidatePath('/dashboard')
    redirect('/dashboard')
}

export async function leaveHousehold() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Get membership
    const { data: membership } = await supabase
        .from('household_members')
        .select('id, household_id, role')
        .eq('user_id', user.id)
        .single()

    if (!membership) return { error: 'Not in a household' }

    if (membership.role === 'owner') {
        // Check if there are other members
        const { count } = await supabase
            .from('household_members')
            .select('id', { count: 'exact', head: true })
            .eq('household_id', membership.household_id)

        if (count && count > 1) {
            return { error: 'Transfer ownership before leaving. You are the household owner.' }
        }

        // If owner is last member, delete the household
        await supabase
            .from('households')
            .delete()
            .eq('id', membership.household_id)
    } else {
        // Regular member can just leave
        await supabase
            .from('household_members')
            .delete()
            .eq('id', membership.id)
    }

    // Sign out
    await supabase.auth.signOut()

    revalidatePath('/')
    redirect('/')
}

export async function deleteHousehold() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: household } = await supabase
        .from('households')
        .select('id')
        .eq('created_by', user.id)
        .single()

    if (!household) return { error: 'You are not the household owner.' }

    // CASCADE will delete members, stores, items
    const { error } = await supabase
        .from('households')
        .delete()
        .eq('id', household.id)

    if (error) return { error: 'Failed to delete household.' }

    await supabase.auth.signOut()

    revalidatePath('/')
    redirect('/')
}

export async function regenerateInviteCode() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const newCode = crypto.randomUUID()

    const { error } = await supabase
        .from('households')
        .update({ invite_code: newCode })
        .eq('created_by', user.id)

    if (error) return { error: 'Failed to regenerate invite code.' }

    revalidatePath('/settings')
    return { success: true, invite_code: newCode }
}
