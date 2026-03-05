import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StoreView } from '@/components/items/store-view'
import { ErrorBoundary } from '@/components/error-boundary'

interface StorePageProps {
    params: Promise<{ storeId: string }>
}

export default async function StorePage({ params }: StorePageProps) {
    const { storeId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Get user's household
    const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single()

    if (!membership) redirect('/')

    // Get store details (verify it belongs to the user's household)
    const { data: store } = await supabase
        .from('stores')
        .select('id, name, household_id')
        .eq('id', storeId)
        .eq('household_id', membership.household_id)
        .single()

    if (!store) redirect('/dashboard')

    return (
        <ErrorBoundary>
            <StoreView
                storeId={store.id}
                storeName={store.name}
                householdId={store.household_id}
            />
        </ErrorBoundary>
    )
}
