'use client'

import { useState, useEffect } from 'react'
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
    onClose: () => void
}

export function EditItemDrawer({ item, onSave, onClose }: EditItemDrawerProps) {
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
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <h3 className="font-bold text-lg text-gray-900">Edit Item</h3>

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

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl shadow-sm hover:bg-blue-600 active:scale-[0.98] transition-all disabled:bg-gray-300"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}
