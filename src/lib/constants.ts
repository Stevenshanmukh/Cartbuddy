// Item categories for the category selector
export const CATEGORIES = [
    { id: 1, name: 'Produce', sort_order: 1 },
    { id: 2, name: 'Dairy & Eggs', sort_order: 2 },
    { id: 3, name: 'Meat & Seafood', sort_order: 3 },
    { id: 4, name: 'Bakery', sort_order: 4 },
    { id: 5, name: 'Frozen', sort_order: 5 },
    { id: 6, name: 'Canned & Jarred', sort_order: 6 },
    { id: 7, name: 'Snacks', sort_order: 7 },
    { id: 8, name: 'Beverages', sort_order: 8 },
    { id: 9, name: 'Household', sort_order: 9 },
    { id: 10, name: 'Personal Care', sort_order: 10 },
    { id: 99, name: 'Other', sort_order: 99 },
] as const

// Undo timeout in milliseconds (5 seconds)
export const UNDO_TIMEOUT_MS = 5000

// Activity feed limit
export const ACTIVITY_FEED_LIMIT = 20

// Presence heartbeat interval (ms)
export const PRESENCE_HEARTBEAT_MS = 15000

// Touch target minimum size
export const MIN_TOUCH_TARGET_PX = 44

// Item statuses
export const ITEM_STATUS = {
    ACTIVE: 'active',
    CHECKED: 'checked',
    ARCHIVED: 'archived',
} as const

// Member roles
export const MEMBER_ROLE = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
} as const

// Activity actions
export const ACTIVITY_ACTION = {
    ITEM_ADDED: 'item_added',
    ITEM_CHECKED: 'item_checked',
    ITEM_UNCHECKED: 'item_unchecked',
    ITEM_DELETED: 'item_deleted',
    ITEM_EDITED: 'item_edited',
    ITEMS_ARCHIVED: 'items_archived',
    STORE_CREATED: 'store_created',
    STORE_DELETED: 'store_deleted',
    MEMBER_JOINED: 'member_joined',
    MEMBER_LEFT: 'member_left',
    SHOPPING_STARTED: 'shopping_started',
    SHOPPING_ENDED: 'shopping_ended',
} as const
