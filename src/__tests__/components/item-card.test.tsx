import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ItemCard } from '@/components/items/item-card'

describe('ItemCard', () => {
    const defaultItem = {
        id: 'item-1',
        name: 'Organic Milk',
        quantity: '2 gallons',
        notes: 'Whole milk',
        status: 'active',
        category_id: 2,
        profiles: { name: 'Steve' },
        created_at: '2026-01-01T00:00:00Z',
    }

    const handlers = {
        onCheck: vi.fn(),
        onUncheck: vi.fn(),
        onDelete: vi.fn(),
        onEdit: vi.fn(),
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders item name and quantity', () => {
        render(<ItemCard item={defaultItem} {...handlers} />)
        expect(screen.getByText('Organic Milk')).toBeInTheDocument()
        expect(screen.getByText('× 2 gallons')).toBeInTheDocument()
    })

    it('renders notes when present', () => {
        render(<ItemCard item={defaultItem} {...handlers} />)
        expect(screen.getByText('Whole milk')).toBeInTheDocument()
    })

    it('renders category name when provided', () => {
        render(<ItemCard item={defaultItem} categoryName="Dairy & Eggs" {...handlers} />)
        expect(screen.getByText('Dairy & Eggs')).toBeInTheDocument()
    })

    it('renders creator badge for active items', () => {
        render(<ItemCard item={defaultItem} {...handlers} />)
        expect(screen.getByText('Steve')).toBeInTheDocument()
    })

    it('hides creator badge for checked items', () => {
        const checkedItem = { ...defaultItem, status: 'checked' }
        render(<ItemCard item={checkedItem} {...handlers} />)
        expect(screen.queryByText('Steve')).not.toBeInTheDocument()
    })

    it('applies strikethrough for checked items', () => {
        const checkedItem = { ...defaultItem, status: 'checked' }
        render(<ItemCard item={checkedItem} {...handlers} />)
        const nameEl = screen.getByText('Organic Milk')
        expect(nameEl.className).toContain('line-through')
    })

    it('calls onCheck when clicking checkbox of active item', () => {
        render(<ItemCard item={defaultItem} {...handlers} />)
        // The checkbox is the first button
        const buttons = screen.getAllByRole('button')
        fireEvent.click(buttons[0])
        expect(handlers.onCheck).toHaveBeenCalledWith('item-1')
    })

    it('calls onUncheck when clicking checkbox of checked item', () => {
        const checkedItem = { ...defaultItem, status: 'checked' }
        render(<ItemCard item={checkedItem} {...handlers} />)
        const buttons = screen.getAllByRole('button')
        fireEvent.click(buttons[0])
        expect(handlers.onUncheck).toHaveBeenCalledWith('item-1')
    })

    it('calls onEdit when clicking edit button', () => {
        render(<ItemCard item={defaultItem} {...handlers} />)
        const editButton = screen.getByLabelText('Edit item')
        fireEvent.click(editButton)
        expect(handlers.onEdit).toHaveBeenCalledWith('item-1')
    })

    it('renders without quantity when not provided', () => {
        const noQtyItem = { ...defaultItem, quantity: null }
        render(<ItemCard item={noQtyItem} {...handlers} />)
        expect(screen.queryByText(/×/)).not.toBeInTheDocument()
    })

    it('renders without notes when not provided', () => {
        const noNotesItem = { ...defaultItem, notes: null }
        render(<ItemCard item={noNotesItem} {...handlers} />)
        expect(screen.queryByText('Whole milk')).not.toBeInTheDocument()
    })

    it('renders without creator badge when profiles is null', () => {
        const noProfileItem = { ...defaultItem, profiles: null }
        render(<ItemCard item={noProfileItem} {...handlers} />)
        expect(screen.queryByText('Steve')).not.toBeInTheDocument()
    })

    it('handles extremely long item names', () => {
        const longNameItem = { ...defaultItem, name: 'A'.repeat(100) }
        render(<ItemCard item={longNameItem} {...handlers} />)
        expect(screen.getByText('A'.repeat(100))).toBeInTheDocument()
    })

    it('handles special characters in item name', () => {
        const specialItem = { ...defaultItem, name: '<script>alert("xss")</script>' }
        render(<ItemCard item={specialItem} {...handlers} />)
        // React escapes by default, so this should be rendered as text
        expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument()
    })
})
