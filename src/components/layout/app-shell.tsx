'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useOffline } from '@/hooks/use-offline'
import { useHousehold } from '@/contexts/household-context'
import { signOut } from '@/app/actions/household'
import { PageTransition } from '@/components/ui/page-transition'
import { motion } from 'framer-motion'
import type { HouseholdWithMembership } from '@/lib/types'

interface AppShellProps {
    userId: string
    userName: string
    userEmail: string
    households: HouseholdWithMembership[]
    children: React.ReactNode
}

const roleBadgeColors = {
    owner: 'bg-amber-100 text-amber-700',
    admin: 'bg-blue-100 text-blue-700',
    member: 'bg-gray-100 text-gray-600',
} as const

export function AppShell({
    userId,
    userName,
    userEmail,
    households,
    children,
}: AppShellProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { isOnline, pendingCount } = useOffline()
    const { activeHousehold, setActiveHouseholdId } = useHousehold()
    const [showSwitcher, setShowSwitcher] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)

    const navItems = [
        {
            href: '/dashboard',
            label: 'Lists',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
            ),
        },
        {
            href: '/activity',
            label: 'Activity',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            href: '/settings',
            label: 'Settings',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
    ]

    function handleSwitchHousehold(id: string) {
        setActiveHouseholdId(id)
        setShowSwitcher(false)
        router.push('/dashboard')
        router.refresh()
    }

    return (
        <div className="min-h-dvh bg-gray-50 flex flex-col">
            {/* Offline Banner */}
            {!isOnline && (
                <div className="bg-amber-500 text-white text-center text-sm py-2 px-4 font-medium">
                    You&apos;re offline — changes will sync when you reconnect
                    {pendingCount > 0 && (
                        <span className="ml-2 bg-amber-600 px-2 py-0.5 rounded-full text-xs">
                            {pendingCount} pending
                        </span>
                    )}
                </div>
            )}

            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                {/* Household Switcher */}
                <button
                    onClick={() => setShowSwitcher(!showSwitcher)}
                    className="flex items-center gap-2 hover:bg-gray-50 rounded-xl px-2 py-1 -ml-2 transition-colors"
                >
                    <h1 className="font-bold text-gray-900 text-lg leading-tight">
                        {activeHousehold?.name || 'CartBuddy'}
                    </h1>
                    {households.length > 1 && (
                        <svg className={cn("w-4 h-4 text-gray-400 transition-transform", showSwitcher && "rotate-180")} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                    )}
                </button>

                {/* User Avatar / Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    >
                        {userName.charAt(0).toUpperCase()}
                    </button>

                    {/* User dropdown */}
                    {showUserMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                                <div className="px-4 py-2 border-b border-gray-100">
                                    <p className="font-medium text-gray-900 text-sm">{userName}</p>
                                    <p className="text-xs text-gray-500">{userEmail}</p>
                                </div>
                                <Link
                                    href="/households"
                                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    🏠 All Households
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </header>

            {/* Household Switcher Dropdown */}
            {showSwitcher && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowSwitcher(false)} />
                    <div className="absolute left-4 right-4 top-14 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-25 max-h-80 overflow-y-auto">
                        {households.map((h) => (
                            <button
                                key={h.id}
                                onClick={() => handleSwitchHousehold(h.id)}
                                className={cn(
                                    'w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors',
                                    h.id === activeHousehold?.id && 'bg-blue-50'
                                )}
                            >
                                <div>
                                    <p className={cn(
                                        'font-medium text-sm',
                                        h.id === activeHousehold?.id ? 'text-blue-700' : 'text-gray-900'
                                    )}>
                                        {h.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {h.member_count} member{h.member_count !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', roleBadgeColors[h.role])}>
                                        {h.role}
                                    </span>
                                    {h.id === activeHousehold?.id && (
                                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        ))}
                        <div className="border-t border-gray-100 mt-1 pt-1">
                            <Link
                                href="/households"
                                className="block px-4 py-2.5 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors"
                                onClick={() => setShowSwitcher(false)}
                            >
                                Manage Households →
                            </Link>
                        </div>
                    </div>
                </>
            )}

            {/* Content */}
            <main className="flex-1 pb-20">
                <PageTransition>
                    {children}
                </PageTransition>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 pb-[env(safe-area-inset-bottom)] z-30">
                <div className="flex items-center justify-around py-2">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[64px] z-10',
                                    isActive
                                        ? 'text-blue-600'
                                        : 'text-gray-400 hover:text-gray-600'
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="bottomNavIndicator"
                                        className="absolute inset-0 bg-blue-50 rounded-xl"
                                        style={{ zIndex: -1 }}
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                {item.icon}
                                <span className="text-[11px] font-medium">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
