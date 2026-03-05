'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useItems, useCategories } from '@/hooks/use-items'
import { useRealtimeItems } from '@/hooks/use-realtime'
import { ItemCard } from '@/components/items/item-card'
import { AddItemSheet } from '@/components/items/add-item-sheet'
import { EditItemDrawer } from '@/components/items/edit-item-drawer'
import { UndoToast } from '@/components/ui/undo-toast'
import { StoreItemsSkeleton } from '@/components/ui/skeletons'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { deleteStore } from '@/app/actions/store'
import { useTransition } from 'react'

interface StoreViewProps {
    storeId: string
    storeName: string
    householdId: string
}

interface UndoAction {
    type: 'delete' | 'check'
    itemId: string
    itemData?: any
}

export function StoreView({ storeId, storeName, householdId }: StoreViewProps) {
    const router = useRouter()
    const { items, isLoading, addItem, updateItem, checkItem, uncheckItem, deleteItem, archiveChecked } = useItems(storeId, householdId, storeName)
    useRealtimeItems(storeId) // Live sync with other household members
    const { data: categories } = useCategories()
    const [editingItem, setEditingItem] = useState<any>(null)
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
    const [undoAction, setUndoAction] = useState<any>(null)
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isDeleting, startTransition] = useTransition()
    const categoryMap = useMemo(() => new Map((categories || []).map((c: any) => [c.id, c.name])), [categories])

    const activeItems = useMemo(() => items.filter((i: any) => i.status === 'active'), [items])
    const checkedItems = useMemo(() => items.filter((i: any) => i.status === 'checked'), [items])

    // Group by category
    const groupedActive = useMemo(() => activeItems.reduce((acc: Record<string, any[]>, item: any) => {
        const key = item.category_id ? (categoryMap.get(item.category_id) || 'Other') : 'Uncategorized'
        if (!acc[key]) acc[key] = []
        acc[key].push(item)
        return acc
    }, {} as Record<string, any[]>), [activeItems, categoryMap])

    // Use ref for items to avoid recreating callbacks when items change
    const itemsRef = useRef(items)
    useEffect(() => {
        itemsRef.current = items
    }, [items])
    const handleAdd = useCallback((item: { name: string; quantity?: string; notes?: string; category_id?: number | null }) => {
        addItem.mutate(item)
    }, [addItem])

    const handleCheck = useCallback((id: string) => {
        checkItem.mutate(id)
        setUndoAction({ type: 'check', itemId: id })
    }, [checkItem])

    const handleUncheck = useCallback((id: string) => {
        uncheckItem.mutate(id)
    }, [uncheckItem])

    const handleDelete = useCallback((id: string) => {
        const item = itemsRef.current.find((i: any) => i.id === id)
        deleteItem.mutate(id)
        setUndoAction({ type: 'delete', itemId: id, itemData: item })
    }, [deleteItem])

    const handleEdit = useCallback((id: string) => {
        const item = itemsRef.current.find((i: any) => i.id === id)
        setEditingItem(item)
    }, [])

    const handleSaveEdit = useCallback((id: string, updates: any) => {
        updateItem.mutate({ id, ...updates })
    }, [updateItem])

    const handleUndo = useCallback(() => {
        if (!undoAction) return

        if (undoAction.type === 'check') {
            uncheckItem.mutate(undoAction.itemId)
        } else if (undoAction.type === 'delete' && undoAction.itemData) {
            // Re-add the deleted item preserving original data via direct re-insert
            const { profiles, ...itemToRestore } = undoAction.itemData
            addItem.mutate({
                name: itemToRestore.name,
                quantity: itemToRestore.quantity,
                notes: itemToRestore.notes,
                category_id: itemToRestore.category_id,
            })
        }
        setUndoAction(null)
    }, [undoAction, uncheckItem, addItem])

    const toggleCategory = useCallback((category: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev)
            if (next.has(category)) next.delete(category)
            else next.add(category)
            return next
        })
    }, [])

    const handleDeleteStore = useCallback(() => {
        startTransition(async () => {
            const result = await deleteStore(storeId, householdId)
            if (result?.error) {
                console.error(result.error)
            } else {
                setIsDeleteDialogOpen(false)
                router.push('/dashboard')
            }
        })
    }, [storeId, householdId, router])

    if (isLoading && items.length === 0) {
        return <StoreItemsSkeleton />
    }

    return (
        <div className="min-h-full">
            {/* Store Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-[57px] z-20">
                <Link
                    href="/dashboard"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </Link>
                <h2 className="text-lg font-bold text-gray-900 flex-1">{storeName}</h2>
                <span className="text-sm text-gray-400">
                    {activeItems.length} item{activeItems.length !== 1 ? 's' : ''}
                </span>
                <button
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
            </div>

            {/* Loading */}
            {items.length === 0 ? (
                /* Empty state */
                <div className="text-center py-20 px-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">No items yet</h3>
                    <p className="text-gray-500 text-sm">Tap the + button to add your first item</p>
                </div>
            ) : (
                <div className="px-4 py-4 space-y-4">
                    {/* Active items by category */}
                    {Object.entries(groupedActive).map(([category, categoryItems]) => {
                        const isCollapsed = collapsedCategories.has(category);
                        return (
                            <div key={category}>
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="flex items-center gap-1.5 w-full text-left mb-2 px-1 group outline-none"
                                >
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">
                                        {category}
                                    </h4>
                                    <motion.svg
                                        animate={{ rotate: isCollapsed ? -90 : 0 }}
                                        className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </motion.svg>
                                    <span className="text-xs font-medium text-gray-300 ml-1">
                                        {(categoryItems as any[]).length}
                                    </span>
                                </button>
                                <motion.div
                                    initial={false}
                                    animate={{
                                        height: isCollapsed ? 0 : 'auto',
                                        opacity: isCollapsed ? 0 : 1,
                                        marginTop: isCollapsed ? 0 : 6
                                    }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="space-y-1.5 pb-1">
                                        <AnimatePresence initial={false}>
                                            {(categoryItems as any[]).map((item: any) => (
                                                <ItemCard
                                                    key={item.id}
                                                    item={item}
                                                    categoryName={item.category_id ? categoryMap.get(item.category_id) : undefined}
                                                    onCheck={handleCheck}
                                                    onUncheck={handleUncheck}
                                                    onDelete={handleDelete}
                                                    onEdit={handleEdit}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            </div>
                        )
                    })}

                    {/* Checked items */}
                    {checkedItems.length > 0 && (
                        <div className="pt-3">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                                    Done ({checkedItems.length})
                                </h4>
                                <button
                                    onClick={() => archiveChecked.mutate()}
                                    className="text-xs text-blue-500 font-medium hover:text-blue-600 transition-colors"
                                >
                                    Clear all
                                </button>
                            </div>
                            <div className="space-y-1.5 opacity-60">
                                <AnimatePresence initial={false}>
                                    {checkedItems.map((item: any) => (
                                        <ItemCard
                                            key={item.id}
                                            item={item}
                                            onCheck={handleCheck}
                                            onUncheck={handleUncheck}
                                            onDelete={handleDelete}
                                            onEdit={handleEdit}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Add Button */}
            <div className="fixed bottom-24 right-4 z-30">
                <button
                    onClick={() => setIsAddSheetOpen(true)}
                    className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
                    aria-label="Add Item"
                >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
            </div>

            {/* Add Item Sheet (Detailed) */}
            <AddItemSheet
                isOpen={isAddSheetOpen}
                onOpenChange={setIsAddSheetOpen}
                onSave={handleAdd}
                isAdding={addItem.isPending}
            />

            {/* Edit Item Drawer */}
            <EditItemDrawer
                item={editingItem}
                onSave={(id, updates) => updateItem.mutate({ id, ...updates })}
                onDelete={(id) => deleteItem.mutate(id)}
                onClose={() => setEditingItem(null)}
            />

            {/* Undo Toast */}
            {undoAction && (
                <UndoToast
                    message={undoAction.type === 'delete' ? 'Item deleted' : 'Item checked'}
                    onUndo={handleUndo}
                    onTimeout={() => setUndoAction(null)}
                />
            )}

            {/* Delete Store Dialog */}
            <AnimatePresence>
                {isDeleteDialogOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden"
                        >
                            <div className="flex items-center gap-3 mb-4 text-red-600">
                                <span className="p-2 bg-red-100 rounded-full">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </span>
                                <h3 className="text-lg font-bold text-gray-900">Delete Store?</h3>
                            </div>
                            <p className="text-gray-500 mb-6 font-medium">
                                Are you sure you want to delete <span className="font-bold text-gray-900">{storeName}</span>? All items inside will be permanently deleted. This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setIsDeleteDialogOpen(false)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteStore}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center min-w-[5rem]"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
