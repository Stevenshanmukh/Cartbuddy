'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface JoinFormProps {
    householdName: string
    householdId: string
    inviteCode: string
}

export function JoinForm({ householdName, householdId, inviteCode }: JoinFormProps) {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleJoin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const userName = (formData.get('name') as string)?.trim()

        if (!userName) {
            setError('Name is required')
            setLoading(false)
            return
        }

        const supabase = createClient()

        try {
            // 1. Sign in anonymously (client-side)
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

            // 3. Add as member
            const { error: memberError } = await supabase
                .from('household_members')
                .insert({
                    household_id: householdId,
                    user_id: userId,
                    role: 'member',
                })

            if (memberError) {
                console.error('Member error:', memberError)
                if (memberError.code === '23505') {
                    setError('You are already a member of this household.')
                } else {
                    setError('Failed to join household.')
                }
                setLoading(false)
                return
            }

            // 4. Log activity
            await supabase.from('activity_logs').insert({
                household_id: householdId,
                user_id: userId,
                action: 'member_joined',
                metadata: { user_name: userName },
            })

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
        <div className="min-h-dvh bg-gradient-to-br from-green-50 via-white to-emerald-50 flex flex-col items-center justify-center px-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/25">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 text-center">
                Join {householdName}
            </h1>
            <p className="text-gray-500 mt-2 text-center">
                You&apos;ve been invited! Enter your name to get started.
            </p>

            <form
                onSubmit={handleJoin}
                className="w-full max-w-sm mt-8 bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 space-y-4 border border-gray-100"
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
                        placeholder="e.g. Alex"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
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
                            : 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-500/25 hover:shadow-xl active:scale-[0.98]'
                    )}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Joining…
                        </span>
                    ) : (
                        'Join Household'
                    )}
                </button>
            </form>
        </div>
    )
}
