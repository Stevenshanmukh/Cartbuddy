'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createHousehold } from '@/app/actions/household'
import { signOut } from '@/app/actions/household'
import { cn } from '@/lib/utils'
import type { HouseholdWithMembership } from '@/lib/types'

const roleBadgeColors = {
    owner: 'bg-amber-100 text-amber-700 border-amber-200',
    admin: 'bg-blue-100 text-blue-700 border-blue-200',
    member: 'bg-gray-100 text-gray-600 border-gray-200',
} as const

interface HouseholdsDashboardProps {
    households: HouseholdWithMembership[]
    userName: string
    userEmail: string
}

export function HouseholdsDashboard({ households, userName, userEmail }: HouseholdsDashboardProps) {
    const [showCreate, setShowCreate] = useState(false)
    const [showJoin, setShowJoin] = useState(false)
    const [joinCode, setJoinCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    function handleSelectHousehold(id: string) {
        // Store the active household in localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('cartbuddy_active_household', id)
        }
        router.push('/dashboard')
    }

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const result = await createHousehold(formData)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
        } else if (result?.success && result?.id) {
            setShowCreate(false)
            setLoading(false)
            handleSelectHousehold(result.id)
        }
    }

    function handleJoinViaCode() {
        if (!joinCode.trim()) return
        // Extract token from URL or use raw code
        let token = joinCode.trim()
        try {
            const url = new URL(token)
            const parts = url.pathname.split('/join/')
            if (parts[1]) token = parts[1]
        } catch {
            // Not a URL, use as-is
        }
        router.push(`/join/${token}`)
    }

    return (
        <div className="min-h-dvh bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4">
                <div className="flex items-center justify-between max-w-lg mx-auto">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Your Households</h1>
                        <p className="text-sm text-gray-500">{userName} · {userEmail}</p>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Scrollable content — padded at bottom for sticky bar */}
            <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-4">
                {/* Household Cards */}
                {households.length > 0 ? (
                    <div className="space-y-3">
                        {households.map((h) => (
                            <button
                                key={h.id}
                                onClick={() => handleSelectHousehold(h.id)}
                                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md hover:border-gray-200 transition-all duration-200 active:scale-[0.99]"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                            {h.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{h.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {h.member_count} member{h.member_count !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        'text-xs font-medium px-2.5 py-1 rounded-full capitalize border',
                                        roleBadgeColors[h.role]
                                    )}>
                                        {h.role}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">No households yet</h2>
                        <p className="text-gray-500 mt-1">Create one or join with an invite link</p>
                    </div>
                )}

                {/* Create Household Form */}
                {showCreate && (
                    <form
                        onSubmit={handleCreate}
                        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 space-y-4"
                    >
                        <h3 className="font-semibold text-gray-900">Create New Household</h3>
                        <div>
                            <label htmlFor="householdName" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Household Name
                            </label>
                            <input
                                id="householdName"
                                name="householdName"
                                type="text"
                                required
                                autoFocus
                                maxLength={50}
                                placeholder="e.g. Apartment 4B"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                        )}
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className={cn(
                                    'flex-1 py-3 font-semibold rounded-xl transition-all text-white',
                                    loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                                )}
                            >
                                {loading ? 'Creating…' : 'Create'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowCreate(false); setError(null) }}
                                className="px-4 py-3 text-sm text-gray-500 hover:text-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* Join Household Form */}
                {showJoin && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 space-y-4">
                        <h3 className="font-semibold text-gray-900">Join a Household</h3>
                        <div>
                            <label htmlFor="joinCode" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Invite Link or Code
                            </label>
                            <input
                                id="joinCode"
                                type="text"
                                autoFocus
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                placeholder="Paste invite link or code"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleJoinViaCode}
                                disabled={!joinCode.trim()}
                                className={cn(
                                    'flex-1 py-3 font-semibold rounded-xl transition-all text-white',
                                    !joinCode.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-[0.98]'
                                )}
                            >
                                Join
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowJoin(false); setJoinCode('') }}
                                className="px-4 py-3 text-sm text-gray-500 hover:text-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-xl border-t border-gray-200/60">
                <div className="max-w-lg mx-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-3">
                    <button
                        onClick={() => { setShowCreate(true); setShowJoin(false); setError(null) }}
                        className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl active:scale-[0.98] transition-all duration-200"
                    >
                        + Create
                    </button>
                    <button
                        onClick={() => { setShowJoin(true); setShowCreate(false); setError(null) }}
                        className="flex-1 py-3.5 px-4 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200"
                    >
                        Join
                    </button>
                </div>
            </div>
        </div>
    )
}
