'use client'

import { cn } from '@/lib/utils'

function Shimmer({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'animate-pulse rounded-xl bg-gray-200/70',
                className
            )}
        />
    )
}

/** Skeleton matching the ItemCard layout */
export function ItemCardSkeleton() {
    return (
        <div className="bg-white p-3.5 flex items-start gap-3 rounded-xl">
            <Shimmer className="w-6 h-6 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <Shimmer className="h-4 w-3/4" />
                <Shimmer className="h-3 w-1/3" />
            </div>
        </div>
    )
}

/** Skeleton matching a store card on the dashboard */
export function StoreCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                    <Shimmer className="h-5 w-2/5" />
                    <Shimmer className="h-3.5 w-1/3" />
                </div>
                <div className="flex items-center gap-2">
                    <Shimmer className="h-8 w-14 rounded-lg" />
                    <Shimmer className="h-5 w-5 rounded" />
                </div>
            </div>
        </div>
    )
}

/** Skeleton for a full page loading state */
export function PageSkeleton({ lines = 3 }: { lines?: number }) {
    return (
        <div className="px-4 py-6 space-y-3">
            <Shimmer className="h-7 w-24 mb-4" />
            {Array.from({ length: lines }).map((_, i) => (
                <StoreCardSkeleton key={i} />
            ))}
        </div>
    )
}

/** Skeleton for store item list */
export function StoreItemsSkeleton() {
    return (
        <div className="px-4 py-4 space-y-4">
            <div className="space-y-1.5">
                <Shimmer className="h-3 w-20 mb-2" />
                {Array.from({ length: 4 }).map((_, i) => (
                    <ItemCardSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}
