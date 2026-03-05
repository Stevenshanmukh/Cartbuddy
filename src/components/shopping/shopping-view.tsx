'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useItems } from '@/hooks/use-items'
import { useRealtimeItems } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

interface ShoppingViewProps {
    storeId: string
    storeName: string
    householdId: string
}

export function ShoppingView({ storeId, storeName, householdId }: ShoppingViewProps) {
    const router = useRouter()
    const { items, isLoading, checkItem, uncheckItem, archiveChecked } = useItems(storeId, householdId, storeName)
    useRealtimeItems(storeId)

    const activeItems = useMemo(() => items.filter((i: any) => i.status === 'active'), [items])
    const checkedItems = useMemo(() => items.filter((i: any) => i.status === 'checked'), [items])
    const totalItems = activeItems.length + checkedItems.length
    const progress = useMemo(() => totalItems > 0 ? (checkedItems.length / totalItems) * 100 : 0, [totalItems, checkedItems.length])

    const hasFiredConfetti = useRef(false)

    useEffect(() => {
        if (totalItems > 0 && activeItems.length === 0 && !hasFiredConfetti.current) {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.5 },
                colors: ['#22c55e', '#3b82f6', '#eab308', '#ec4899', '#a855f7'],
                disableForReducedMotion: true
            })
            hasFiredConfetti.current = true
        } else if (activeItems.length > 0 && hasFiredConfetti.current) {
            hasFiredConfetti.current = false
        }
    }, [totalItems, activeItems.length])

    const handleCheck = useCallback((id: string) => {
        checkItem.mutate(id)
    }, [checkItem])

    const handleUncheck = useCallback((id: string) => {
        uncheckItem.mutate(id)
    }, [uncheckItem])

    const handleDone = useCallback(() => {
        archiveChecked.mutate()
        router.push('/dashboard')
    }, [archiveChecked, router])

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            {/* Shopping Header */}
            <div className="safe-area-top bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-sm font-medium">Exit</span>
                    </button>
                    <h1 className="text-lg font-bold text-white">{storeName}</h1>
                    <span className="text-sm text-gray-400">
                        {checkedItems.length}/{totalItems}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <svg className="animate-spin h-8 w-8 text-green-500" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                ) : totalItems === 0 ? (
                    <div className="text-center py-20 px-4">
                        <div className="w-20 h-20 bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-white text-lg mb-1">List is empty</h3>
                        <p className="text-gray-500">Add items in management mode first</p>
                        <button
                            onClick={() => router.push(`/store/${storeId}`)}
                            className="mt-4 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-500 transition-colors"
                        >
                            Add items
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Active items */}
                        {activeItems.length > 0 && (
                            <div className="px-4 pt-4 pb-2">
                                <div className="space-y-2">
                                    <AnimatePresence initial={false}>
                                        {activeItems.map((item: any) => (
                                            <motion.button
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                                key={item.id}
                                                onClick={() => handleCheck(item.id)}
                                                className="w-full flex items-center gap-4 bg-gray-900 rounded-2xl p-4 active:bg-gray-800 transition-colors group"
                                            >
                                                <div className="w-8 h-8 rounded-full border-2 border-gray-600 flex-shrink-0 group-hover:border-green-500 transition-colors" />
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className="text-white font-medium text-base truncate">
                                                        {item.name}
                                                    </p>
                                                    {item.quantity && (
                                                        <p className="text-gray-500 text-sm mt-0.5">
                                                            Qty: {item.quantity}
                                                        </p>
                                                    )}
                                                </div>
                                                {item.notes && (
                                                    <p className="text-gray-600 text-xs max-w-[100px] truncate">
                                                        {item.notes}
                                                    </p>
                                                )}
                                            </motion.button>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {/* Checked items */}
                        {checkedItems.length > 0 && (
                            <div className="px-4 py-2">
                                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 px-1">
                                    In Cart ({checkedItems.length})
                                </h3>
                                <div className="space-y-1.5">
                                    <AnimatePresence initial={false}>
                                        {checkedItems.map((item: any) => (
                                            <motion.button
                                                layout
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 0.5, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                                whileHover={{ opacity: 0.7 }}
                                                key={item.id}
                                                onClick={() => handleUncheck(item.id)}
                                                className="w-full flex items-center gap-4 bg-gray-900/50 rounded-2xl p-4 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-500 font-medium text-base line-through truncate text-left">
                                                    {item.name}
                                                    {item.quantity && <span className="text-gray-600 ml-1.5">× {item.quantity}</span>}
                                                </p>
                                            </motion.button>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Bottom action bar */}
            {checkedItems.length > 0 && (
                <div className="safe-area-bottom bg-gray-900/80 backdrop-blur-xl border-t border-gray-800 px-4 py-4">
                    <button
                        onClick={handleDone}
                        className={cn(
                            'w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98]',
                            progress >= 100
                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                : 'bg-gray-800 text-green-400 border border-green-500/30'
                        )}
                    >
                        {progress >= 100 ? '🎉 All Done — Archive Items' : `Done Shopping (${checkedItems.length} items)`}
                    </button>
                </div>
            )}
        </div>
    )
}
