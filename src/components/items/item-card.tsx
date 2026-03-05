'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Helper to generate consistent styling for users
function getUserColor(name: string) {
    if (!name) return 'bg-gray-100 text-gray-600 border-gray-200'

    const colors = [
        'bg-blue-50 text-blue-600 border-blue-100',
        'bg-emerald-50 text-emerald-600 border-emerald-100',
        'bg-violet-50 text-violet-600 border-violet-100',
        'bg-rose-50 text-rose-600 border-rose-100',
        'bg-amber-50 text-amber-600 border-amber-100',
        'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100',
        'bg-sky-50 text-sky-600 border-sky-100',
        'bg-orange-50 text-orange-600 border-orange-100'
    ]

    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colors.length
    return colors[index]
}

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
    const [swiping, setSwiping] = useState(false)
    const startX = useRef(0)
    const x = useMotionValue(0)

    const isChecked = item.status === 'checked'
    const creatorName = item.profiles?.name
    const colorClasses = useMemo(() => creatorName ? getUserColor(creatorName) : '', [creatorName])

    // Derive background opacity and icon scale from swipe distance
    const deleteOpacity = useTransform(x, [-100, -40, 0], [1, 0.5, 0])
    const trashScale = useTransform(x, [-100, -60, 0], [1.3, 1, 0.8])

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX
        setSwiping(true)
    }, [])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!swiping) return
        const dx = e.touches[0].clientX - startX.current
        if (dx < 0) {
            x.set(Math.max(dx, -100))
        }
    }, [swiping, x])

    const handleTouchEnd = useCallback(() => {
        setSwiping(false)
        if (x.get() < -60) {
            onDelete(item.id)
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(10)
        }
        x.set(0)
    }, [x, item.id, onDelete])

    const handleCheck = useCallback(() => {
        if (isChecked) {
            onUncheck(item.id)
        } else {
            onCheck(item.id)
            // Haptic feedback on check
            if (navigator.vibrate) navigator.vibrate(8)
        }
    }, [isChecked, item.id, onCheck, onUncheck])

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-xl"
        >
            {/* Delete background */}
            <motion.div
                className="absolute inset-0 bg-red-500 flex items-center justify-end px-4 rounded-xl"
                style={{ opacity: deleteOpacity }}
            >
                <motion.div style={{ scale: trashScale }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </motion.div>
            </motion.div>

            {/* Card content */}
            <motion.div
                className={cn(
                    'relative bg-white p-3.5 flex items-start gap-3',
                    !swiping && 'transition-transform duration-200'
                )}
                style={{ x }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                whileTap={{ scale: 0.98 }}
            >
                {/* Checkbox */}
                <motion.button
                    onClick={handleCheck}
                    className={cn(
                        'w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center',
                        isChecked
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-blue-400'
                    )}
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                    <AnimatePresence>
                        {isChecked && (
                            <motion.svg
                                className="w-3.5 h-3.5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={3}
                                stroke="currentColor"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                exit={{ pathLength: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                            >
                                <motion.path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.5 12.75l6 6 9-13.5"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.25, delay: 0.05 }}
                                />
                            </motion.svg>
                        )}
                    </AnimatePresence>
                </motion.button>

                {/* Item details */}
                <button
                    onClick={handleCheck}
                    className="flex-1 text-left min-w-0"
                >
                    <p className={cn(
                        'font-medium text-sm transition-all duration-200',
                        isChecked ? 'line-through text-gray-400' : 'text-gray-900'
                    )}>
                        {item.name}
                        {item.quantity && (
                            <span className="text-gray-400 font-normal ml-1.5">
                                × {item.quantity}
                            </span>
                        )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        {categoryName && (
                            <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
                                {categoryName}
                            </span>
                        )}
                        {item.notes && (
                            <span className="text-[11px] text-gray-400 truncate max-w-[120px]">
                                {item.notes}
                            </span>
                        )}
                    </div>
                </button>

                {/* User indicator & Edit Button */}
                {!isChecked && (
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                        {creatorName && (
                            <div className={`whitespace-nowrap text-[10px] font-medium px-2 py-0.5 rounded-full border ${colorClasses}`}>
                                {creatorName}
                            </div>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onEdit(item.id)
                            }}
                            className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                            aria-label="Edit item"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    )
}
