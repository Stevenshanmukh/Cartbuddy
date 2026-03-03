import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/stores/ui-store'

describe('useUIStore', () => {
    beforeEach(() => {
        // Reset store to defaults before each test
        useUIStore.setState({
            mode: 'management',
            activeStoreId: null,
            isOnline: true,
            pendingSyncCount: 0,
        })
    })

    describe('mode', () => {
        it('starts in management mode', () => {
            expect(useUIStore.getState().mode).toBe('management')
        })

        it('setMode changes to shopping', () => {
            useUIStore.getState().setMode('shopping')
            expect(useUIStore.getState().mode).toBe('shopping')
        })

        it('setMode changes to management', () => {
            useUIStore.getState().setMode('shopping')
            useUIStore.getState().setMode('management')
            expect(useUIStore.getState().mode).toBe('management')
        })

        it('toggleMode from management to shopping', () => {
            useUIStore.getState().toggleMode()
            expect(useUIStore.getState().mode).toBe('shopping')
        })

        it('toggleMode from shopping to management', () => {
            useUIStore.getState().setMode('shopping')
            useUIStore.getState().toggleMode()
            expect(useUIStore.getState().mode).toBe('management')
        })

        it('double toggle returns to original mode', () => {
            useUIStore.getState().toggleMode()
            useUIStore.getState().toggleMode()
            expect(useUIStore.getState().mode).toBe('management')
        })
    })

    describe('activeStoreId', () => {
        it('starts as null', () => {
            expect(useUIStore.getState().activeStoreId).toBeNull()
        })

        it('setActiveStoreId sets store id', () => {
            useUIStore.getState().setActiveStoreId('store-abc')
            expect(useUIStore.getState().activeStoreId).toBe('store-abc')
        })

        it('setActiveStoreId can reset to null', () => {
            useUIStore.getState().setActiveStoreId('store-abc')
            useUIStore.getState().setActiveStoreId(null)
            expect(useUIStore.getState().activeStoreId).toBeNull()
        })
    })

    describe('isOnline', () => {
        it('setIsOnline changes to false', () => {
            useUIStore.getState().setIsOnline(false)
            expect(useUIStore.getState().isOnline).toBe(false)
        })

        it('setIsOnline changes back to true', () => {
            useUIStore.getState().setIsOnline(false)
            useUIStore.getState().setIsOnline(true)
            expect(useUIStore.getState().isOnline).toBe(true)
        })
    })

    describe('pendingSyncCount', () => {
        it('starts at 0', () => {
            expect(useUIStore.getState().pendingSyncCount).toBe(0)
        })

        it('setPendingSyncCount sets value', () => {
            useUIStore.getState().setPendingSyncCount(5)
            expect(useUIStore.getState().pendingSyncCount).toBe(5)
        })

        it('incrementPendingSync increments by 1', () => {
            useUIStore.getState().incrementPendingSync()
            expect(useUIStore.getState().pendingSyncCount).toBe(1)
        })

        it('incrementPendingSync multiple times', () => {
            useUIStore.getState().incrementPendingSync()
            useUIStore.getState().incrementPendingSync()
            useUIStore.getState().incrementPendingSync()
            expect(useUIStore.getState().pendingSyncCount).toBe(3)
        })

        it('decrementPendingSync decrements by 1', () => {
            useUIStore.getState().setPendingSyncCount(3)
            useUIStore.getState().decrementPendingSync()
            expect(useUIStore.getState().pendingSyncCount).toBe(2)
        })

        it('decrementPendingSync does not go below 0', () => {
            useUIStore.getState().decrementPendingSync()
            expect(useUIStore.getState().pendingSyncCount).toBe(0)
        })

        it('decrementPendingSync from 1 gives 0', () => {
            useUIStore.getState().setPendingSyncCount(1)
            useUIStore.getState().decrementPendingSync()
            expect(useUIStore.getState().pendingSyncCount).toBe(0)
        })
    })
})
