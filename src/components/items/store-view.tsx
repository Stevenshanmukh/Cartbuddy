'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useItems, useCategories } from '@/hooks/use-items'
import { useRealtimeItems } from '@/hooks/use-realtime'
import { ItemCard } from '@/components/items/item-card'
import { QuickAddInput } from '@/components/items/quick-add-input'
import { EditItemDrawer } from '@/components/items/edit-item-drawer'
import { UndoToast } from '@/components/ui/undo-toast'
import Link from 'next/link'

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
    const [undoAction, setUndoAction] = useState<UndoAction | null>(null)

    const categoryMap = new Map((categories || []).map((c: any) => [c.id, c.name]))

    const activeItems = items.filter((i: any) => i.status === 'active')
    const checkedItems = items.filter((i: any) => i.status === 'checked')

    // Group by category
    const groupedActive = activeItems.reduce((acc: Record<string, any[]>, item: any) => {
        const key = item.category_id ? (categoryMap.get(item.category_id) || 'Other') : 'Uncategorized'
        if (!acc[key]) acc[key] = []
        acc[key].push(item)
        return acc
    }, {} as Record<string, any[]>)

    const handleAdd = useCallback((item: { name: string; quantity?: string }) => {
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
        const item = items.find((i: any) => i.id === id)
        deleteItem.mutate(id)
        setUndoAction({ type: 'delete', itemId: id, itemData: item })
    }, [deleteItem, items])

    const handleEdit = useCallback((id: string) => {
        const item = items.find((i: any) => i.id === id)
        setEditingItem(item)
    }, [items])

    const handleSaveEdit = useCallback((id: string, updates: any) => {
        updateItem.mutate({ id, ...updates })
    }, [updateItem])

    const handleUndo = useCallback(() => {
        if (!undoAction) return

        if (undoAction.type === 'check') {
            uncheckItem.mutate(undoAction.itemId)
        } else if (undoAction.type === 'delete' && undoAction.itemData) {
            // Re-add the deleted item
            addItem.mutate({
                name: undoAction.itemData.name,
                quantity: undoAction.itemData.quantity,
                notes: undoAction.itemData.notes,
                category_id: undoAction.itemData.category_id,
            })
        }
        setUndoAction(null)
    }, [undoAction, uncheckItem, addItem])

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
            </div>

            {/* Loading */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : items.length === 0 ? (
                /* Empty state */
                <div className="text-center py-20 px-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">No items yet</h3>
                    <p className="text-gray-500 text-sm">Use the input below to add your first item</p>
                </div>
            ) : (
                <div className="px-4 py-4 space-y-4">
                    {/* Active items by category */}
                    {Object.entries(groupedActive).map(([category, categoryItems]) => (
                        <div key={category}>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                                {category}
                            </h4>
                            <div className="space-y-1.5">
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
                            </div>
                        </div>
                    ))}

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
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Add Input */}
            <QuickAddInput onAdd={handleAdd} isAdding={addItem.isPending} />

            {/* Edit Drawer */}
            <EditItemDrawer
                item={editingItem}
                onSave={handleSaveEdit}
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
        </div>
    )
}
