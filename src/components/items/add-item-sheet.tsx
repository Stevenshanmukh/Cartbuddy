import { useState, useRef, useEffect } from 'react'
import { Drawer } from 'vaul'
import { useCategories } from '@/hooks/use-items'
import { cn } from '@/lib/utils'

interface AddItemSheetProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSave: (item: { name: string; quantity?: string; notes?: string; category_id?: number | null }) => void
    isAdding?: boolean
}

export function AddItemSheet({ isOpen, onOpenChange, onSave, isAdding }: AddItemSheetProps) {
    const [name, setName] = useState('')
    const [quantity, setQuantity] = useState('')
    const [notes, setNotes] = useState('')
    const [categoryId, setCategoryId] = useState<number | null>(null)
    const { data: categories } = useCategories()

    function handleOpenChange(open: boolean) {
        if (!open) {
            setTimeout(() => {
                setName('')
                setQuantity('')
                setNotes('')
                setCategoryId(null)
            }, 300)
        }
        onOpenChange(open)
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim() || isAdding) return

        onSave({
            name: name.trim(),
            quantity: quantity.trim() || undefined,
            notes: notes.trim() || undefined,
            category_id: categoryId,
        })

        onOpenChange(false)
    }

    return (
        <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-4 mt-4" />

                    <div className="max-w-md w-full mx-auto flex-1 overflow-y-auto w-full">
                        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-5">
                            <div className="flex items-center justify-between">
                                <Drawer.Title className="font-bold text-xl text-gray-900">Add Item</Drawer.Title>
                            </div>

                            <div>
                                <label htmlFor="addName" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="addName"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    autoFocus
                                    maxLength={100}
                                    placeholder="e.g. Organic Milk"
                                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 text-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="addQty" className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Quantity
                                    </label>
                                    <input
                                        id="addQty"
                                        type="text"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        placeholder="e.g. 2 gallons"
                                        maxLength={30}
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="addCategory" className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Category
                                    </label>
                                    <select
                                        id="addCategory"
                                        value={categoryId || ''}
                                        onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 bg-white"
                                    >
                                        <option value="">Uncategorized</option>
                                        {(categories || []).map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="addNotes" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Notes
                                </label>
                                <textarea
                                    id="addNotes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any details, brand preferences..."
                                    maxLength={200}
                                    rows={2}
                                    className="w-full px-4 py-3 flex-1 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400 resize-none"
                                />
                            </div>

                            <div className="sticky bottom-0 bg-white pt-4 pb-2 mt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleOpenChange(false)}
                                    className="flex-1 py-4 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!name.trim() || isAdding}
                                    className={cn(
                                        "flex-1 py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] shadow-sm",
                                        name.trim() && !isAdding
                                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30"
                                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    )}
                                >
                                    {isAdding ? 'Saving...' : 'Save Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
