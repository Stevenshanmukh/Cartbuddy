'use client'

import { useState } from 'react'
import { Drawer } from 'vaul'
import { useQueryClient } from '@tanstack/react-query'
import { useHousehold } from '@/contexts/household-context'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface CreateStoreSheetProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateStoreSheet({ isOpen, onOpenChange }: CreateStoreSheetProps) {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
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
                metadata: { store_name: name.trim() }
            })
        }

        // Invalidate the stores query
        await queryClient.invalidateQueries({ queryKey: ['stores', activeHouseholdId] })

        // Reset and close
        setName('')
        setLoading(false)
        onOpenChange(false)
    }

    // Handle closing and sweeping state
    function handleOpenChange(open: boolean) {
        if (!open) {
            setName('')
            setError(null)
        }
        onOpenChange(open)
    }

    return (
        <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
                <Drawer.Content className="bg-white flex flex-col rounded-t-[20px] h-[80vh] md:h-auto md:max-h-[85vh] fixed bottom-0 left-0 right-0 z-50 focus:outline-none">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 my-4" />

                    <div className="px-4 pb-8 overflow-y-auto">
                        <Drawer.Title className="text-xl font-bold text-gray-900 mb-6 px-1">
                            Add New Store
                        </Drawer.Title>

                        <form onSubmit={handleSubmit} className="px-1 space-y-5">
                            <div>
                                <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-2">
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

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading || !name.trim()}
                                    className={cn(
                                        'w-full py-4 font-bold text-lg rounded-2xl transition-all shadow-sm',
                                        loading || !name.trim()
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                                    )}
                                >
                                    {loading ? 'Creating…' : 'Create Store'}
                                </button>
                            </div>
                        </form>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
