// Database types — matches our multi-tenant schema
// Tables: profiles, households, household_members, invites, stores, categories, items, activity_logs

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    name: string
                    avatar_url: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    name: string
                    avatar_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    avatar_url?: string | null
                    created_at?: string
                }
            }
            households: {
                Row: {
                    id: string
                    name: string
                    created_by: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name?: string
                    created_by: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    created_by?: string
                    created_at?: string
                }
            }
            household_members: {
                Row: {
                    id: string
                    household_id: string
                    user_id: string
                    role: 'owner' | 'admin' | 'member'
                    joined_at: string
                }
                Insert: {
                    id?: string
                    household_id: string
                    user_id: string
                    role?: 'owner' | 'admin' | 'member'
                    joined_at?: string
                }
                Update: {
                    id?: string
                    household_id?: string
                    user_id?: string
                    role?: 'owner' | 'admin' | 'member'
                    joined_at?: string
                }
            }
            invites: {
                Row: {
                    id: string
                    household_id: string
                    token: string
                    created_by: string
                    expires_at: string | null
                    max_uses: number | null
                    use_count: number
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    household_id: string
                    token?: string
                    created_by: string
                    expires_at?: string | null
                    max_uses?: number | null
                    use_count?: number
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    household_id?: string
                    token?: string
                    created_by?: string
                    expires_at?: string | null
                    max_uses?: number | null
                    use_count?: number
                    is_active?: boolean
                    created_at?: string
                }
            }
            stores: {
                Row: {
                    id: string
                    household_id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    household_id: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    household_id?: string
                    name?: string
                    created_at?: string
                }
            }
            categories: {
                Row: {
                    id: number
                    name: string
                    sort_order: number
                }
                Insert: {
                    id?: number
                    name: string
                    sort_order?: number
                }
                Update: {
                    id?: number
                    name?: string
                    sort_order?: number
                }
            }
            items: {
                Row: {
                    id: string
                    store_id: string
                    name: string
                    quantity: string | null
                    notes: string | null
                    category_id: number | null
                    status: 'active' | 'checked' | 'archived'
                    created_by: string
                    checked_by: string | null
                    checked_at: string | null
                    version: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    name: string
                    quantity?: string | null
                    notes?: string | null
                    category_id?: number | null
                    status?: 'active' | 'checked' | 'archived'
                    created_by: string
                    checked_by?: string | null
                    checked_at?: string | null
                    version?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    name?: string
                    quantity?: string | null
                    notes?: string | null
                    category_id?: number | null
                    status?: 'active' | 'checked' | 'archived'
                    created_by?: string
                    checked_by?: string | null
                    checked_at?: string | null
                    version?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            activity_logs: {
                Row: {
                    id: string
                    household_id: string
                    user_id: string
                    action: string
                    item_name: string | null
                    store_name: string | null
                    metadata: Record<string, unknown> | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    household_id: string
                    user_id: string
                    action: string
                    item_name?: string | null
                    store_name?: string | null
                    metadata?: Record<string, unknown> | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    household_id?: string
                    user_id?: string
                    action?: string
                    item_name?: string | null
                    store_name?: string | null
                    metadata?: Record<string, unknown> | null
                    created_at?: string
                }
            }
        }
    }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Household = Database['public']['Tables']['households']['Row']
export type HouseholdMember = Database['public']['Tables']['household_members']['Row']
export type Invite = Database['public']['Tables']['invites']['Row']
export type Store = Database['public']['Tables']['stores']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Item = Database['public']['Tables']['items']['Row']
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']

// Extended types for UI
export type ItemWithCreator = Item & {
    creator_name?: string
    pending?: boolean // Optimistic UI flag
}

export type MemberWithProfile = HouseholdMember & {
    profile: Profile
}

export type StoreWithItemCount = Store & {
    item_count: number
}

// Household with membership context
export type HouseholdWithMembership = Household & {
    role: 'owner' | 'admin' | 'member'
    member_count: number
}

// Presence types
export type UserPresence = {
    user_id: string
    user_name: string
    status: 'online' | 'shopping'
    shopping_store_id: string | null
    last_seen: string
}

// Sync types
export type SyncOperation = {
    id?: number
    table: string
    type: 'INSERT' | 'UPDATE' | 'DELETE'
    data: Record<string, unknown>
    timestamp: number
    status: 'pending' | 'completed' | 'failed' | 'discarded'
    retryCount: number
}
