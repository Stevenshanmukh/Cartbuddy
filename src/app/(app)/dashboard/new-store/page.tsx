'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useHousehold } from '@/contexts/household-context'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function NewStorePage() {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const queryClient = useQueryClient()
    const { activeHouseholdId } = useHousehold()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim() || !activeHouseholdId) return

        setLoading(true)
        setError(null)

        const supabase = createClient()
        const { error: insertError } = await supabase
            .from('stores')
            .insert({
                name: name.trim(),
                household_id: activeHouseholdId,
            })

        if (insertError) {
            setError('Failed to create store.')
            setLoading(false)
            return
        }

        // Log activity
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase.from('activity_logs').insert({
                household_id: activeHouseholdId,
                user_id: user.id,
                action: 'store_created',
                store_name: name.trim(),
            })
        }

        // Invalidate the stores query so dashboard shows the new store immediately
        await queryClient.invalidateQueries({ queryKey: ['stores', activeHouseholdId] })
        router.push('/dashboard')
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
                        required
                        autoFocus
                        maxLength={50}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Walmart, Costco"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className={cn(
                            'flex-1 py-3 font-semibold rounded-xl transition-all text-white',
                            loading || !name.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                        )}
                    >
                        {loading ? 'Creating…' : 'Create Store'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    )
}
