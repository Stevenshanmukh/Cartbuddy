import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
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

    // Get stores with item counts
    const { data: stores } = await supabase
        .from('stores')
        .select('id, name, created_at')
        .eq('household_id', membership.household_id)
        .order('created_at', { ascending: true })

    // Get active item counts per store
    const { data: items } = await supabase
        .from('items')
        .select('store_id, status')
        .in('store_id', (stores || []).map(s => s.id))

    const storeCounts = (stores || []).map(store => {
        const storeItems = (items || []).filter(i => i.store_id === store.id)
        const activeCount = storeItems.filter(i => i.status === 'active').length
        const checkedCount = storeItems.filter(i => i.status === 'checked').length
        return { ...store, activeCount, checkedCount }
    })

    return (
        <div className="px-4 py-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Stores</h2>
                <Link
                    href="/dashboard/new-store"
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 text-white font-medium rounded-xl text-sm shadow-sm hover:bg-blue-600 active:scale-[0.97] transition-all"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Store
                </Link>
            </div>

            {storeCounts.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">No stores yet</h3>
                    <p className="text-gray-500 text-sm">Add your first store to start building lists</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {storeCounts.map((store) => (
                        <Link
                            key={store.id}
                            href={`/store/${store.id}`}
                            className="block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{store.name}</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {store.activeCount} item{store.activeCount !== 1 ? 's' : ''}
                                        {store.checkedCount > 0 && (
                                            <span className="text-green-500 ml-2">
                                                ✓ {store.checkedCount} done
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={`/shop/${store.id}`}
                                        className="px-3 py-1.5 bg-green-50 text-green-600 font-medium rounded-lg text-sm hover:bg-green-100 transition-colors relative z-10"
                                    >
                                        Shop
                                    </a>
                                    <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
