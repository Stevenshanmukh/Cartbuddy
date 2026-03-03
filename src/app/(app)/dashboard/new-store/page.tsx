'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewStorePage() {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        setError(null)

        const supabase = createClient()

        // Get user's household
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: membership } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', user.id)
            .single()

        if (!membership) return

        const { error: insertError } = await supabase
            .from('stores')
            .insert({
                household_id: membership.household_id,
                name: name.trim(),
            })

        if (insertError) {
            setError('Failed to create store')
            setLoading(false)
            return
        }

        // Log activity
        const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single()

        await supabase.from('activity_logs').insert({
            household_id: membership.household_id,
            user_id: user.id,
            action: 'store_created',
            store_name: name.trim(),
            metadata: { created_by_name: profile?.name },
        })

        router.push('/dashboard')
        router.refresh()
    }

    return (
        <div className="px-4 py-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add Store</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Store Name
                    </label>
                    <input
                        id="storeName"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Walmart, Costco, Target"
                        required
                        autoFocus
                        maxLength={50}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl shadow-sm hover:bg-blue-600 active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating…' : 'Create Store'}
                    </button>
                </div>
            </form>
        </div>
    )
}
