'use client'

import { useState } from 'react'
import { joinHouseholdByInvite } from '@/app/actions/household'
import { cn } from '@/lib/utils'

interface JoinConfirmProps {
    householdName: string
    token: string
}

export function JoinConfirm({ householdName, token }: JoinConfirmProps) {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleJoin() {
        setLoading(true)
        setError(null)

        const result = await joinHouseholdByInvite(token)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
        // If successful, the server action will redirect
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
                You&apos;ve been invited! Click below to join.
            </p>

            <div className="w-full max-w-sm mt-8 space-y-4">
                {error && (
                    <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg text-center">
                        {error}
                    </p>
                )}

                <button
                    onClick={handleJoin}
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

                <a href="/households" className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    Go to Households instead
                </a>
            </div>
        </div>
    )
}
