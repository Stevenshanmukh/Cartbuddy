import { create } from 'zustand'

type Mode = 'management' | 'shopping'

interface UIState {
    // Mode
    mode: Mode
    setMode: (mode: Mode) => void
    toggleMode: () => void

    // Active store (for shopping mode)
    activeStoreId: string | null
    setActiveStoreId: (id: string | null) => void

    // Online status
    isOnline: boolean
    setIsOnline: (online: boolean) => void

    // Pending sync count
    pendingSyncCount: number
    setPendingSyncCount: (count: number) => void
    incrementPendingSync: () => void
    decrementPendingSync: () => void
}

export const useUIStore = create<UIState>((set) => ({
    // Mode
    mode: 'management',
    setMode: (mode) => set({ mode }),
    toggleMode: () =>
        set((state) => ({
            mode: state.mode === 'management' ? 'shopping' : 'management',
        })),

    // Active store
    activeStoreId: null,
    setActiveStoreId: (id) => set({ activeStoreId: id }),

    // Online status
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    setIsOnline: (online) => set({ isOnline: online }),

    // Pending sync
    pendingSyncCount: 0,
    setPendingSyncCount: (count) => set({ pendingSyncCount: count }),
    incrementPendingSync: () =>
        set((state) => ({ pendingSyncCount: state.pendingSyncCount + 1 })),
    decrementPendingSync: () =>
        set((state) => ({
            pendingSyncCount: Math.max(0, state.pendingSyncCount - 1),
        })),
}))
