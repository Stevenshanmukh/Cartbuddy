'use client'

import { useState } from 'react'
import { leaveHousehold, deleteHousehold, regenerateInviteCode } from '@/app/actions/household'
import { timeAgo } from '@/lib/utils'

interface Member {
    userId: string
    name: string
    role: string
    joinedAt: string
}

interface SettingsClientProps {
    userName: string
    householdName: string
    inviteCode: string
    isOwner: boolean
    members: Member[]
}

export function SettingsClient({
    userName,
    householdName,
    inviteCode,
    isOwner,
    members,
}: SettingsClientProps) {
    const [copied, setCopied] = useState(false)
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const inviteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/join/${inviteCode}`
        : `/join/${inviteCode}`

    async function copyInviteLink() {
        try {
            await navigator.clipboard.writeText(inviteUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback for older browsers
            const input = document.createElement('input')
            input.value = inviteUrl
            document.body.appendChild(input)
            input.select()
            document.execCommand('copy')
            document.body.removeChild(input)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    async function handleShare() {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Join ${householdName} on CartBuddy`,
                    text: `Join our shopping list household!`,
                    url: inviteUrl,
                })
            } catch {
                // User cancelled share
            }
        } else {
            copyInviteLink()
        }
    }

    return (
        <div className="px-4 py-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>

            {/* Profile */}
            <section className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Profile</h3>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">{userName}</p>
                        <p className="text-sm text-gray-500">{isOwner ? 'Owner' : 'Member'}</p>
                    </div>
                </div>
            </section>

            {/* Invite Link */}
            <section className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Invite Link</h3>
                <p className="text-sm text-gray-500 mb-3">Share this link with roommates to join your household.</p>
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
                {isOwner && (
                    <div className="mt-3">
                        <button
                            type="button"
                            onClick={() => regenerateInviteCode()}
                            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Regenerate invite link
                        </button>
                    </div>
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
                                <p className="text-sm text-red-600 mb-3">Are you sure? You'll need a new invite link to rejoin.</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowLeaveConfirm(false)}
                                        className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => leaveHousehold()}
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
                                        type="button"
                                        onClick={() => deleteHousehold()}
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
