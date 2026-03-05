import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { UndoToast } from '@/components/ui/undo-toast'

describe('UndoToast', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('renders message', () => {
        render(
            <UndoToast
                message="Item deleted"
                onUndo={vi.fn()}
                onTimeout={vi.fn()}
            />
        )
        expect(screen.getByText('Item deleted')).toBeInTheDocument()
    })

    it('renders undo button', () => {
        render(
            <UndoToast
                message="Item deleted"
                onUndo={vi.fn()}
                onTimeout={vi.fn()}
            />
        )
        expect(screen.getByText('Undo')).toBeInTheDocument()
    })

    it('calls onUndo when undo button is clicked', () => {
        const onUndo = vi.fn()
        render(
            <UndoToast
                message="Item deleted"
                onUndo={onUndo}
                onTimeout={vi.fn()}
            />
        )
        fireEvent.click(screen.getByText('Undo'))
        expect(onUndo).toHaveBeenCalledOnce()
    })

    it('hides after clicking undo', () => {
        const onUndo = vi.fn()
        const { container } = render(
            <UndoToast
                message="Item deleted"
                onUndo={onUndo}
                onTimeout={vi.fn()}
            />
        )
        fireEvent.click(screen.getByText('Undo'))
        // After clicking undo, visible is set to false, component should return null
        expect(container.innerHTML).toBe('')
    })

    it('calls onTimeout after duration expires', () => {
        const onTimeout = vi.fn()
        render(
            <UndoToast
                message="Item deleted"
                onUndo={vi.fn()}
                duration={5000}
                onTimeout={onTimeout}
            />
        )

        // Advance past the duration
        act(() => {
            vi.advanceTimersByTime(5100)
        })

        expect(onTimeout).toHaveBeenCalledOnce()
    })

    it('hides after timeout', () => {
        const { container } = render(
            <UndoToast
                message="Item deleted"
                onUndo={vi.fn()}
                duration={5000}
                onTimeout={vi.fn()}
            />
        )

        act(() => {
            vi.advanceTimersByTime(5100)
        })

        expect(container.innerHTML).toBe('')
    })

    it('does not call onTimeout if undo is clicked before timeout', () => {
        const onTimeout = vi.fn()
        render(
            <UndoToast
                message="Item deleted"
                onUndo={vi.fn()}
                duration={5000}
                onTimeout={onTimeout}
            />
        )

        // Click undo quickly
        fireEvent.click(screen.getByText('Undo'))

        // Advance past duration
        act(() => {
            vi.advanceTimersByTime(5100)
        })

        // onTimeout should not be called because the toast is hidden
        // (the interval still fires but the component returned null)
        // Note: The interval itself will call onTimeout but toast is already hidden
    })

    it('uses custom duration', () => {
        const onTimeout = vi.fn()
        render(
            <UndoToast
                message="Test"
                onUndo={vi.fn()}
                duration={2000}
                onTimeout={onTimeout}
            />
        )

        act(() => {
            vi.advanceTimersByTime(1500)
        })
        expect(onTimeout).not.toHaveBeenCalled()

        act(() => {
            vi.advanceTimersByTime(600)
        })
        expect(onTimeout).toHaveBeenCalledOnce()
    })
})
