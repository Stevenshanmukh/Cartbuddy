'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteStore(storeId: string, householdId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Verify user is a member of the household owning the store
    const { data: membership } = await supabase
        .from('household_members')
        .select('role')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .single()

    if (!membership) {
        return { error: 'You do not have permission to delete this store.' }
    }

    // Get store name for activity log before deletion
    const { data: store } = await supabase
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .single()

    const storeName = store?.name || 'Unknown Store'

    // Delete the store (CASCADE will handle the items)
    const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId)

    if (error) {
        return { error: `Failed to delete store: ${error.message}` }
    }

    // Log Activity
    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

    await supabase.from('activity_logs').insert({
        household_id: householdId,
        user_id: user.id,
        action: 'store_deleted',
        store_name: storeName,
        metadata: { user_name: profile?.name || 'Unknown' }
    })

    revalidatePath('/dashboard')
    return { success: true }
}
