/**
 * IndexedDB-backed offline mutation queue.
 * Queues Supabase operations when the app is offline,
 * replays them FIFO when connectivity returns.
 */

const DB_NAME = 'cartbuddy-sync'
const DB_VERSION = 1
const STORE_NAME = 'mutations'

export interface QueuedMutation {
    id?: number // Auto-incremented
    table: string
    operation: 'insert' | 'update' | 'delete'
    data: Record<string, any>
    filter?: Record<string, any> // For update/delete WHERE clauses
    timestamp: number
    retries: number
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true,
                })
            }
        }
    })
}

/**
 * Add a mutation to the offline queue.
 */
export async function queueMutation(mutation: Omit<QueuedMutation, 'id'>): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).add(mutation)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

/**
 * Get all queued mutations in FIFO order.
 */
export async function getQueuedMutations(): Promise<QueuedMutation[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const request = tx.objectStore(STORE_NAME).getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Remove a mutation from the queue after successful replay.
 */
export async function removeMutation(id: number): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(id)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

/**
 * Get the count of pending mutations.
 */
export async function getPendingCount(): Promise<number> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const request = tx.objectStore(STORE_NAME).count()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Clear all queued mutations (e.g., after full sync).
 */
export async function clearQueue(): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}
