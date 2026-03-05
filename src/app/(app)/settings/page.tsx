'use client'

import { useState, useEffect, useMemo } from 'react'
import { useHousehold } from '@/contexts/household-context'
import { leaveHousehold, deleteHousehold } from '@/app/actions/household'
import { regenerateInvite, getActiveInvite } from '@/app/actions/invites'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Member {
    userId: string
    name: string
    role: string
    joinedAt: string
}

export default function SettingsPage() {
    const { activeHousehold, activeHouseholdId, userRole } = useHousehold()
    const [members, setMembers] = useState<Member[]>([])
    const [inviteToken, setInviteToken] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const isOwner = userRole === 'owner'

    useEffect(() => {
        if (!activeHouseholdId) return

        async function loadData() {
            // Get members
            const { data: memberData } = await supabase
                .from('household_members')
                .select('user_id, role, joined_at')
                .eq('household_id', activeHouseholdId!)
                .order('joined_at', { ascending: true })

            if (memberData) {
                const memberUserIds = memberData.map(m => m.user_id)
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .in('id', memberUserIds)

                const profileMap = new Map((profiles || []).map(p => [p.id, p.name]))
                setMembers(memberData.map(m => ({
                    userId: m.user_id,
                    name: profileMap.get(m.user_id) || 'Unknown',
                    role: m.role,
                    joinedAt: m.joined_at,
                })))
            }

            // Get active invite
            const result = await getActiveInvite(activeHouseholdId!)
            if (result?.invite) {
                setInviteToken(result.invite.token)
            }

            setLoading(false)
        }

        loadData()
    }, [activeHouseholdId])

    const inviteUrl = typeof window !== 'undefined' && inviteToken
        ? `${window.location.origin}/join/${inviteToken}`
        : ''

    async function copyInviteLink() {
        if (!inviteUrl) return
        try {
            await navigator.clipboard.writeText(inviteUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Modern fallback using textarea + Selection API
            const textarea = document.createElement('textarea')
            textarea.value = inviteUrl
            textarea.style.position = 'fixed'
            textarea.style.left = '-9999px'
            document.body.appendChild(textarea)
            textarea.focus()
            textarea.select()
            try {
                const selection = document.getSelection()
                if (selection) {
                    const range = document.createRange()
                    range.selectNodeContents(textarea)
                    selection.removeAllRanges()
                    selection.addRange(range)
                }
                document.execCommand('copy') // Last resort, still works in most browsers
            } catch { /* ignore */ }
            document.body.removeChild(textarea)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    async function handleShare() {
        if (navigator.share && inviteUrl) {
            try {
                await navigator.share({
                    title: `Join ${activeHousehold?.name} on CartBuddy`,
                    text: 'Join our shopping list household!',
                    url: inviteUrl,
                })
            } catch {
                // User cancelled share
            }
        } else {
            copyInviteLink()
        }
    }

    async function handleRegenerate() {
        if (!activeHouseholdId) return
        const result = await regenerateInvite(activeHouseholdId)
        if (result?.invite) {
            setInviteToken(result.invite.token)
        }
    }

    async function handleLeave() {
        if (!activeHouseholdId) return
        setActionError(null)
        const result = await leaveHousehold(activeHouseholdId)
        if (result?.error) {
            setActionError(result.error)
        } else {
            router.push('/households')
            router.refresh()
        }
    }

    async function handleDelete() {
        if (!activeHouseholdId) return
        setActionError(null)
        const result = await deleteHousehold(activeHouseholdId)
        if (result?.error) {
            setActionError(result.error)
        } else {
            router.push('/households')
            router.refresh()
        }
    }

    if (loading) {
        return (
            <div className="px-4 py-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-24" />
                    <div className="h-24 bg-gray-100 rounded-2xl" />
                    <div className="h-24 bg-gray-100 rounded-2xl" />
                </div>
            </div>
        )
    }

    return (
        <div className="px-4 py-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>

            {/* Household Info */}
            <section className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Household</h3>
                <p className="font-semibold text-gray-900">{activeHousehold?.name}</p>
                <p className="text-sm text-gray-500">Your role: <span className="capitalize">{userRole}</span></p>
            </section>

            {/* Invite Link */}
            <section className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Invite Link</h3>
                <p className="text-sm text-gray-500 mb-3">Share this link with roommates to join your household.</p>
                {inviteToken ? (
                    <>
                        <div className="flex gap-2">
                            <button
                                onClick={handleShare}
                                className="flex-1 py-3 bg-blue-50 text-blue-600 font-medium rounded-xl hover:bg-blue-100 active:scale-[0.98] transition-all text-sm"
                            >
                                {copied ? '✓ Copied!' : '📤 Share Link'}
                            </button>
                            <button
                                onClick={copyInviteLink}
                                className="py-3 px-4 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all text-sm"
                            >
                                {copied ? '✓' : '📋'}
                            </button>
                        </div>
                        {(isOwner || userRole === 'admin') && (
                            <div className="mt-3">
                                <button
                                    onClick={handleRegenerate}
                                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    Regenerate invite link
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-sm text-gray-400">No active invite. Create one above.</p>
                )}
            </section>

            {/* Members */}
            <section className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Members ({members.length})
                </h3>
                <div className="space-y-3">
                    {members.map((member) => (
                        <div key={member.userId} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-sm font-bold">
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 text-sm">
                                        {member.name}
                                        {member.role === 'owner' && (
                                            <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                                Owner
                                            </span>
                                        )}
                                        {member.role === 'admin' && (
                                            <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                                Admin
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-400">Joined {timeAgo(member.joinedAt)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Danger Zone */}
            <section className="space-y-3">
                <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wide">Danger Zone</h3>
                {actionError && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center justify-between">
                        <p className="text-sm text-red-600">{actionError}</p>
                        <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 ml-3">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                {!isOwner ? (
                    <>
                        {!showLeaveConfirm ? (
                            <button
                                onClick={() => setShowLeaveConfirm(true)}
                                className="w-full py-3 border border-red-200 text-red-500 font-medium rounded-xl hover:bg-red-50 transition-colors"
                            >
                                Leave Household
                            </button>
                        ) : (
                            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                                <p className="text-sm text-red-600 mb-3">Are you sure? You&apos;ll need a new invite link to rejoin.</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowLeaveConfirm(false)}
                                        className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleLeave}
                                        className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-xl text-sm"
                                    >
                                        Leave
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full py-3 border border-red-200 text-red-500 font-medium rounded-xl hover:bg-red-50 transition-colors"
                            >
                                Delete Household
                            </button>
                        ) : (
                            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                                <p className="text-sm text-red-600 mb-3 font-semibold">⚠️ This will delete everything — all stores, items, and members.</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-xl text-sm"
                                    >
                                        Delete Forever
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}
