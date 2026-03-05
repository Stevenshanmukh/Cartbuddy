'use client'

import { useState, useEffect } from 'react'
import { Drawer } from 'vaul'
import { useCategories } from '@/hooks/use-items'

interface EditItemDrawerProps {
    item: {
        id: string
        name: string
        quantity?: string | null
        notes?: string | null
        category_id?: number | null
    } | null
    onSave: (id: string, updates: { name: string; quantity?: string; notes?: string; category_id?: number | null }) => void
    onDelete?: (id: string) => void
    onClose: () => void
}

export function EditItemDrawer({ item, onSave, onDelete, onClose }: EditItemDrawerProps) {
    const [name, setName] = useState('')
    const [quantity, setQuantity] = useState('')
    const [notes, setNotes] = useState('')
    const [categoryId, setCategoryId] = useState<number | null>(null)
    const { data: categories } = useCategories()

    useEffect(() => {
        if (item) {
            setName(item.name)
            setQuantity(item.quantity || '')
            setNotes(item.notes || '')
            setCategoryId(item.category_id || null)
        }
    }, [item])

    if (!item) return null

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) return

        onSave(item!.id, {
            name: name.trim(),
            quantity: quantity.trim() || undefined,
            notes: notes.trim() || undefined,
            category_id: categoryId,
        })
        onClose()
    }

    return (
        <Drawer.Root open={!!item} onOpenChange={(open) => !open && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />

                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[20px] flex flex-col focus:outline-none max-h-[85vh]">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 my-4" />

                    <div className="px-4 pb-8 overflow-y-auto">
                        <Drawer.Title className="font-bold text-xl text-gray-900 mb-6 px-1">
                            Edit Item
                        </Drawer.Title>

                        <form onSubmit={handleSubmit} className="px-1 space-y-5">

                            <div>
                                <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-1">
                                    Name
                                </label>
                                <input
                                    id="editName"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    autoFocus
                                    maxLength={100}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="editQty" className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity
                                    </label>
                                    <input
                                        id="editQty"
                                        type="text"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        placeholder="e.g. 2 lbs"
                                        maxLength={30}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="editCategory" className="block text-sm font-medium text-gray-700 mb-1">
                                        Category
                                    </label>
                                    <select
                                        id="editCategory"
                                        value={categoryId || ''}
                                        onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 bg-white"
                                    >
                                        <option value="">None</option>
                                        {(categories || []).map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="editNotes" className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <input
                                    id="editNotes"
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any details…"
                                    maxLength={200}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                {onDelete && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onDelete(item!.id)
                                            onClose()
                                        }}
                                        className="py-4 px-5 border border-red-200 text-red-600 font-medium rounded-2xl hover:bg-red-50 transition-colors flex items-center justify-center flex-shrink-0"
                                        aria-label="Delete item"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-4 border border-gray-200 text-gray-600 font-medium rounded-2xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!name.trim()}
                                    className="flex-1 py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:bg-gray-300"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
