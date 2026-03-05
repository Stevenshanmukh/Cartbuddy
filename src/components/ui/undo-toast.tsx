'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'

interface UndoToastProps {
    message: string
    onUndo: () => void
    duration?: number
    onTimeout: () => void
}

export function UndoToast({ message, onUndo, duration = 5000, onTimeout }: UndoToastProps) {
    const [progress, setProgress] = useState(100)
    const [visible, setVisible] = useState(true)
    const onTimeoutRef = useRef(onTimeout)
    useEffect(() => {
        onTimeoutRef.current = onTimeout
    }, [onTimeout])

    useEffect(() => {
        const startTime = Date.now()
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
            setProgress(remaining)
            if (remaining <= 0) {
                clearInterval(interval)
                setVisible(false)
                onTimeoutRef.current()
            }
        }, 50)

        return () => clearInterval(interval)
    }, [duration])

    const handleUndo = useCallback(() => {
        setVisible(false)
        onUndo()
    }, [onUndo])

    if (!visible) return null

    return (
        <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="bg-gray-900 text-white rounded-xl px-4 py-3 shadow-2xl flex items-center justify-between overflow-hidden">
                <span className="text-sm font-medium truncate mr-3">{message}</span>
                <button
                    onClick={handleUndo}
                    className="text-blue-400 font-semibold text-sm whitespace-nowrap hover:text-blue-300 transition-colors"
                >
                    Undo
                </button>
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-700">
                    <div
                        className="h-full bg-blue-400 transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    )
}
