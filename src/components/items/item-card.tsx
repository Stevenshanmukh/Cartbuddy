'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface ItemCardProps {
    item: {
        id: string
        name: string
        quantity?: string | null
        notes?: string | null
        status: string
        category_id?: number | null
        profiles?: { name: string } | null
        created_at: string
    }
    categoryName?: string
    onCheck: (id: string) => void
    onUncheck: (id: string) => void
    onDelete: (id: string) => void
    onEdit: (id: string) => void
}

export function ItemCard({
    item,
    categoryName,
    onCheck,
    onUncheck,
    onDelete,
    onEdit,
}: ItemCardProps) {
    const [swipeX, setSwipeX] = useState(0)
    const [swiping, setSwiping] = useState(false)
    const startX = useRef(0)
    const cardRef = useRef<HTMLDivElement>(null)

    const isChecked = item.status === 'checked'
    const creatorName = (item as any).profiles?.name

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX
        setSwiping(true)
    }, [])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!swiping) return
        const dx = e.touches[0].clientX - startX.current
        // Only allow left swipe
        if (dx < 0) {
            setSwipeX(Math.max(dx, -100))
        }
    }, [swiping])

    const handleTouchEnd = useCallback(() => {
        setSwiping(false)
        if (swipeX < -60) {
            // Trigger delete
            onDelete(item.id)
        }
        setSwipeX(0)
    }, [swipeX, item.id, onDelete])

    return (
        <div className="relative overflow-hidden rounded-xl">
            {/* Delete background */}
            <div className="absolute inset-0 bg-red-500 flex items-center justify-end px-4 rounded-xl">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
            </div>

            {/* Card content */}
            <div
                ref={cardRef}
                className={cn(
                    'relative bg-white p-3.5 flex items-start gap-3 transition-transform',
                    !swiping && 'transition-transform duration-200'
                )}
                style={{ transform: `translateX(${swipeX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Checkbox */}
                <button
                    onClick={() => isChecked ? onUncheck(item.id) : onCheck(item.id)}
                    className={cn(
                        'w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                        isChecked
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-blue-400'
                    )}
                >
                    {isChecked && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    )}
                </button>

                {/* Item details */}
                <button
                    onClick={() => onEdit(item.id)}
                    className="flex-1 text-left min-w-0"
                >
                    <p className={cn(
                        'font-medium text-sm transition-all',
                        isChecked ? 'line-through text-gray-400' : 'text-gray-900'
                    )}>
                        {item.name}
                        {item.quantity && (
                            <span className="text-gray-400 font-normal ml-1.5">
                                × {item.quantity}
                            </span>
                        )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        {categoryName && (
                            <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                                {categoryName}
                            </span>
                        )}
                        {item.notes && (
                            <span className="text-[11px] text-gray-400 truncate max-w-[140px]">
                                {item.notes}
                            </span>
                        )}
                        {creatorName && (
                            <span className="text-[11px] text-blue-400">
                                by {creatorName}
                            </span>
                        )}
                    </div>
                </button>
            </div>
        </div>
    )
}
