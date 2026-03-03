'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface QuickAddInputProps {
    onAdd: (item: { name: string; quantity?: string }) => void
    isAdding?: boolean
}

export function QuickAddInput({ onAdd, isAdding }: QuickAddInputProps) {
    const [value, setValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const trimmed = value.trim()
        if (!trimmed) return

        // Parse "2x Milk" or "Milk x3" pattern
        const qtyMatch = trimmed.match(/^(\d+)\s*[x×]\s*(.+)$/i) ||
            trimmed.match(/^(.+?)\s*[x×]\s*(\d+)$/i)

        if (qtyMatch) {
            const isQtyFirst = /^\d/.test(trimmed)
            onAdd({
                name: isQtyFirst ? qtyMatch[2].trim() : qtyMatch[1].trim(),
                quantity: isQtyFirst ? qtyMatch[1] : qtyMatch[2],
            })
        } else {
            onAdd({ name: trimmed })
        }

        setValue('')
        inputRef.current?.focus()
    }

    return (
        <div className="sticky bottom-20 z-20 px-4 pb-2">
            <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 bg-white rounded-2xl shadow-lg shadow-gray-200/60 border border-gray-100 px-4 py-2"
            >
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Add item… (e.g. 2x Milk)"
                    className="flex-1 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
                    maxLength={100}
                />
                <button
                    type="submit"
                    disabled={!value.trim() || isAdding}
                    className={cn(
                        'px-4 py-2 text-sm font-semibold rounded-xl transition-all',
                        value.trim()
                            ? 'bg-blue-500 text-white shadow-sm hover:bg-blue-600 active:scale-[0.97]'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}
                >
                    {isAdding ? '…' : 'Add'}
                </button>
            </form>
        </div>
    )
}
