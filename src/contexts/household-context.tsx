'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { HouseholdWithMembership } from '@/lib/types'

interface HouseholdContextValue {
    households: HouseholdWithMembership[]
    activeHouseholdId: string | null
    activeHousehold: HouseholdWithMembership | null
    userRole: 'owner' | 'admin' | 'member' | null
    setActiveHouseholdId: (id: string) => void
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

const STORAGE_KEY = 'cartbuddy_active_household'

export function HouseholdProvider({
    children,
    households,
    userId,
}: {
    children: React.ReactNode
    households: HouseholdWithMembership[]
    userId: string
}) {
    const queryClient = useQueryClient()

    // Initialize active household from localStorage or first household
    const [activeHouseholdId, setActiveHouseholdIdState] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY)
            // Verify stored household is still valid
            if (stored && households.some(h => h.id === stored)) {
                return stored
            }
        }
        return households[0]?.id || null
    })

    const activeHousehold = households.find(h => h.id === activeHouseholdId) || null

    const setActiveHouseholdId = useCallback((id: string) => {
        const supabase = createClient()

        // 1. Remove all realtime channels
        supabase.removeAllChannels()

        // 2. Selectively clear household-scoped query caches (keep categories, profile, etc.)
        const householdScopedKeys = ['items', 'stores', 'activity', 'members']
        householdScopedKeys.forEach(key => {
            queryClient.removeQueries({ queryKey: [key] })
        })

        // 3. Update state and localStorage
        setActiveHouseholdIdState(id)
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, id)
        }
    }, [queryClient])

    // Update localStorage when active household changes
    useEffect(() => {
        if (activeHouseholdId && typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, activeHouseholdId)
        }
    }, [activeHouseholdId])

    return (
        <HouseholdContext.Provider
            value={{
                households,
                activeHouseholdId,
                activeHousehold,
                userRole: activeHousehold?.role || null,
                setActiveHouseholdId,
            }}
        >
            {children}
        </HouseholdContext.Provider>
    )
}

export function useHousehold() {
    const context = useContext(HouseholdContext)
    if (!context) {
        throw new Error('useHousehold must be used within a HouseholdProvider')
    }
    return context
}
