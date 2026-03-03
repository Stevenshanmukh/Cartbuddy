'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function LandingPage() {
    const [showCreate, setShowCreate] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const userName = (formData.get('name') as string)?.trim()
        const householdName = (formData.get('householdName') as string)?.trim() || 'My Household'

        if (!userName) {
            setError('Name is required')
            setLoading(false)
            return
        }

        const supabase = createClient()

        try {
            // 1. Sign in anonymously (client-side so cookies are set properly)
            const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
            if (authError || !authData.user) {
                console.error('Auth error:', authError)
                setError('Failed to create account. Please try again.')
                setLoading(false)
                return
            }

            const userId = authData.user.id

            // 2. Create profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({ id: userId, name: userName })

            if (profileError) {
                console.error('Profile error:', profileError)
                setError('Failed to create profile.')
                setLoading(false)
                return
            }

            // 3. Create household
            const { data: household, error: householdError } = await supabase
                .from('households')
                .insert({ name: householdName, created_by: userId })
                .select()
                .single()

            if (householdError || !household) {
                console.error('Household error:', householdError)
                setError('Failed to create household.')
                setLoading(false)
                return
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
                console.error('Member error:', memberError)
                setError('Failed to join household.')
                setLoading(false)
                return
            }

            // Success — redirect to dashboard
            router.push('/dashboard')
            router.refresh()
        } catch (err) {
            console.error('Unexpected error:', err)
            setError('Something went wrong. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-dvh bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center px-6">
            {/* Logo & Branding */}
            <div className="text-center mb-10">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/25">
                    <svg
                        className="w-10 h-10 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                        />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    CartBuddy
                </h1>
                <p className="text-gray-500 mt-2 text-lg">
                    Shop together, in real time
                </p>
            </div>

            {/* Action Card */}
            <div className="w-full max-w-sm">
                {!showCreate ? (
                    <div className="space-y-3">
                        <button
                            onClick={() => setShowCreate(true)}
                            className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] transition-all duration-200 text-lg"
                        >
                            Create Household
                        </button>
                        <p className="text-center text-sm text-gray-400">
                            Got an invite link? Just open it.
                        </p>
                    </div>
                ) : (
                    <form
                        onSubmit={handleCreate}
                        className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 space-y-4 border border-gray-100"
                    >
                        <div>
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Your Name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                autoFocus
                                maxLength={30}
                                placeholder="e.g. Steve"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="householdName"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Household Name
                            </label>
                            <input
                                id="householdName"
                                name="householdName"
                                type="text"
                                maxLength={50}
                                placeholder="e.g. Apartment 4B"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                'w-full py-3.5 font-semibold rounded-xl transition-all duration-200 text-white',
                                loading
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 hover:shadow-xl active:scale-[0.98]'
                            )}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Creating…
                                </span>
                            ) : (
                                "Let's Go"
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowCreate(false)
                                setError(null)
                            }}
                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                    </form>
                )}
            </div>

            {/* Footer */}
            <p className="text-xs text-gray-400 mt-12">
                No account needed • Works offline • Free forever
            </p>
        </div>
    )
}
