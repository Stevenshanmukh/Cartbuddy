import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/stores/ui-store'

describe('UIStore (Zustand)', () => {
    beforeEach(() => {
        // Reset store to initial state
        useUIStore.setState({
            mode: 'management',
            activeStoreId: null,
            isOnline: true,
            pendingSyncCount: 0,
        })
    })

    it('has correct initial state', () => {
        const state = useUIStore.getState()
        expect(state.mode).toBe('management')
        expect(state.activeStoreId).toBeNull()
        expect(state.pendingSyncCount).toBe(0)
    })

    it('toggles mode between management and shopping', () => {
        const store = useUIStore.getState()
        store.toggleMode()
        expect(useUIStore.getState().mode).toBe('shopping')
        store.toggleMode()
        expect(useUIStore.getState().mode).toBe('management')
    })

    it('sets mode explicitly', () => {
        useUIStore.getState().setMode('shopping')
        expect(useUIStore.getState().mode).toBe('shopping')
        useUIStore.getState().setMode('management')
        expect(useUIStore.getState().mode).toBe('management')
    })

    it('sets active store id', () => {
        useUIStore.getState().setActiveStoreId('store-123')
        expect(useUIStore.getState().activeStoreId).toBe('store-123')
    })

    it('clears active store id', () => {
        useUIStore.getState().setActiveStoreId('store-123')
        useUIStore.getState().setActiveStoreId(null)
        expect(useUIStore.getState().activeStoreId).toBeNull()
    })

    it('sets online status', () => {
        useUIStore.getState().setIsOnline(false)
        expect(useUIStore.getState().isOnline).toBe(false)
        useUIStore.getState().setIsOnline(true)
        expect(useUIStore.getState().isOnline).toBe(true)
    })

    it('increments pending sync count', () => {
        useUIStore.getState().incrementPendingSync()
        expect(useUIStore.getState().pendingSyncCount).toBe(1)
        useUIStore.getState().incrementPendingSync()
        expect(useUIStore.getState().pendingSyncCount).toBe(2)
    })

    it('decrements pending sync count', () => {
        useUIStore.getState().setPendingSyncCount(5)
        useUIStore.getState().decrementPendingSync()
        expect(useUIStore.getState().pendingSyncCount).toBe(4)
    })

    it('does not decrement below zero', () => {
        useUIStore.getState().setPendingSyncCount(0)
        useUIStore.getState().decrementPendingSync()
        expect(useUIStore.getState().pendingSyncCount).toBe(0)
    })

    it('sets pending sync count directly', () => {
        useUIStore.getState().setPendingSyncCount(10)
        expect(useUIStore.getState().pendingSyncCount).toBe(10)
    })
})
