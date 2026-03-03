import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cn, timeAgo, tempId, debounce } from '@/lib/utils'

describe('cn (class name merge)', () => {
    it('merges simple class names', () => {
        expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles falsy values', () => {
        expect(cn('foo', false, null, undefined, 'bar')).toBe('foo bar')
    })

    it('handles conditional classes', () => {
        const isActive = true
        expect(cn('base', isActive && 'active')).toBe('base active')
    })

    it('resolves tailwind conflicts (last wins)', () => {
        expect(cn('p-4', 'p-2')).toBe('p-2')
    })

    it('resolves complex tailwind conflicts', () => {
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('returns empty string for no input', () => {
        expect(cn()).toBe('')
    })

    it('handles array input', () => {
        expect(cn(['foo', 'bar'])).toBe('foo bar')
    })
})

describe('timeAgo', () => {
    it('formats a recent date as relative time', () => {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const result = timeAgo(fiveMinAgo)
        expect(result).toContain('minutes ago')
    })

    it('accepts Date object', () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        const result = timeAgo(oneHourAgo)
        expect(result).toContain('ago')
    })

    it('handles very recent times', () => {
        const justNow = new Date().toISOString()
        const result = timeAgo(justNow)
        expect(result).toContain('ago')
    })
})

describe('tempId', () => {
    it('returns a string', () => {
        expect(typeof tempId()).toBe('string')
    })

    it('returns unique values', () => {
        const ids = new Set(Array.from({ length: 100 }, () => tempId()))
        expect(ids.size).toBe(100)
    })

    it('returns UUID format', () => {
        const id = tempId()
        // UUID v4 format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })
})

describe('debounce', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('delays function execution', () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 300)

        debounced()
        expect(fn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(300)
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('resets timer on subsequent calls', () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 300)

        debounced()
        vi.advanceTimersByTime(200)
        debounced() // Reset the timer
        vi.advanceTimersByTime(200)
        expect(fn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(100)
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('passes arguments to the function', () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 100)

        debounced('hello', 'world')
        vi.advanceTimersByTime(100)

        expect(fn).toHaveBeenCalledWith('hello', 'world')
    })

    it('only calls the function once for rapid calls', () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 100)

        debounced()
        debounced()
        debounced()
        debounced()
        debounced()

        vi.advanceTimersByTime(100)
        expect(fn).toHaveBeenCalledTimes(1)
    })
})
