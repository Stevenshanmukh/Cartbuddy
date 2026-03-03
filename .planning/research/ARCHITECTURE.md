# Architecture Patterns

**Domain:** Real-time Collaborative PWA with Offline Support
**Researched:** 2026-03-02
**Confidence:** HIGH (verified with official Supabase docs and 2026 ecosystem sources)

## Recommended Architecture

CartBuddy follows a **Multi-Tier Client-Server Architecture with Real-time Sync** pattern, optimized for collaborative household shopping with offline-first capabilities.

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT TIER                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   UI Layer   │  │ State Layer  │  │ Offline Layer│          │
│  │              │  │              │  │              │          │
│  │ Next.js      │  │ Optimistic   │  │ Service      │          │
│  │ App Router   │◄─┤ UI State     │◄─┤ Worker       │          │
│  │ Components   │  │ (useOptimistic)│ │ (Serwist)    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│  ┌─────────────────────────▼──────────────────────────┐         │
│  │         LOCAL DATA LAYER (IndexedDB)                │         │
│  │  - Cached shopping lists                            │         │
│  │  - Pending mutations (operation queue)              │         │
│  │  - User preferences                                 │         │
│  └─────────────────────────┬──────────────────────────┘         │
└────────────────────────────┼────────────────────────────────────┘
                             │
                    WebSocket │ HTTPS
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   API GATEWAY (Kong)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼────────┐  ┌───────▼───────┐  ┌───────▼────────┐
│  Supabase Auth  │  │   PostgREST   │  │   Realtime     │
│   (GoTrue)      │  │   REST API    │  │   (Phoenix)    │
│                 │  │               │  │                │
│ - Anonymous     │  │ - CRUD ops    │  │ - WebSocket    │
│ - Invite links  │  │ - RLS check   │  │ - Broadcast    │
│ - JWT tokens    │  │               │  │ - Presence     │
└────────┬────────┘  └───────┬───────┘  └───────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   PostgreSQL     │
                    │                  │
                    │ - Shopping lists │
                    │ - Items          │
                    │ - Households     │
                    │ - Members        │
                    │ - RLS policies   │
                    └──────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With | Protocol |
|-----------|---------------|-------------------|----------|
| **Next.js App Router** | UI rendering, routing, initial data fetch | State Layer, Supabase Client | Direct calls |
| **Optimistic UI State** | Instant UI updates, rollback on failure | UI Layer, Local Data Layer | React state |
| **Service Worker** | Offline asset caching, background sync | Browser Cache, Local Data Layer | Cache API |
| **Local Data Layer (IndexedDB)** | Persistent offline storage, operation queue | Service Worker, Sync Engine | IDB API |
| **Sync Engine** | Conflict resolution, queue processing | Local Data, Supabase Client | Custom logic |
| **Supabase Client** | API abstraction, WebSocket management | Auth, PostgREST, Realtime | REST/WebSocket |
| **Kong API Gateway** | Request routing, rate limiting | All Supabase services | HTTP/WebSocket |
| **GoTrue (Auth)** | User authentication, JWT issuance | PostgreSQL, Kong | JWT/REST |
| **PostgREST** | REST API generation from schema | PostgreSQL, Kong | REST |
| **Realtime (Phoenix)** | WebSocket connections, change streaming | PostgreSQL (via WAL), Kong | WebSocket |
| **PostgreSQL** | Source of truth, RLS enforcement | All backend services | SQL/Replication |

### Data Flow

#### Read Path (Online)
```
User opens app
  → Next.js Server Component fetches initial data via PostgREST
  → Client Component subscribes to Realtime channel
  → PostgreSQL changes stream through WAL → Realtime → WebSocket → Client
  → UI updates reactively
```

#### Write Path (Online with Optimistic UI)
```
User adds item
  → useOptimistic immediately updates UI (optimistic)
  → Mutation sent to PostgREST
  → PostgreSQL processes write + RLS check
  → If success: Realtime broadcasts to all household members
  → If failure: useOptimistic reverts to previous state
  → IndexedDB cache updated with confirmed state
```

#### Write Path (Offline)
```
User adds item (no connection)
  → useOptimistic updates UI immediately
  → Mutation queued in IndexedDB operation log
  → Service Worker detects offline state
  → Background Sync API registers sync task
  → When online: Service Worker triggers sync
  → Sync Engine processes queue sequentially
  → Conflict detection via timestamp comparison
  → Successful mutations remove from queue
```

#### Real-time Broadcast Flow
```
Member A adds item
  → PostgreSQL INSERT triggers
  → WAL entry created
  → Realtime polls replication slot
  → Realtime appends subscription IDs to record
  → Message routed via Erlang VM to connected clients
  → Member B's WebSocket receives JSON payload
  → Client merges update into local state
  → UI re-renders with new item
```

## Patterns to Follow

### Pattern 1: Optimistic UI with React 19 useOptimistic Hook
**What:** Immediately show user actions in the UI while server processes in background
**When:** All user mutations (add item, check item, delete item)
**Why:** Users perceive apps with optimistic updates as 2-3x faster

**Example:**
```typescript
'use client'
import { useOptimistic } from 'react'

export function ShoppingList({ items }) {
  const [optimisticItems, addOptimisticItem] = useOptimistic(
    items,
    (state, newItem) => [...state, { ...newItem, pending: true }]
  )

  async function addItem(formData) {
    const newItem = { name: formData.get('name'), id: crypto.randomUUID() }

    // Immediate UI update
    addOptimisticItem(newItem)

    // Server mutation
    const { data, error } = await supabase
      .from('items')
      .insert(newItem)

    // If error, useOptimistic auto-reverts
    if (error) {
      toast.error('Failed to add item')
    }
  }

  return (
    <form action={addItem}>
      {optimisticItems.map(item => (
        <Item key={item.id} {...item} isPending={item.pending} />
      ))}
    </form>
  )
}
```

### Pattern 2: Client Component Realtime Subscriptions
**What:** Subscribe to database changes via WebSocket in client components only
**When:** Data that needs instant updates across devices
**Why:** Server Components cannot maintain WebSocket connections

**Example:**
```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function RealtimeList({ householdId, initialItems }) {
  const [items, setItems] = useState(initialItems)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`household:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `household_id=eq.${householdId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(item =>
              item.id === payload.new.id ? payload.new : item
            ))
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(item => item.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId])

  return <ListView items={items} />
}
```

### Pattern 3: Server Component Initial Data + Client Realtime
**What:** Server Component fetches initial data, passes to Client Component for realtime
**When:** Every page with live data
**Why:** Fast initial render (SSR) + reactive updates (realtime)

**Example:**
```typescript
// app/list/[id]/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'
import { RealtimeList } from './realtime-list'

export default async function ListPage({ params }) {
  const supabase = createClient()

  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('household_id', params.id)

  // Pass initial data to client component
  return <RealtimeList householdId={params.id} initialItems={items} />
}
```

### Pattern 4: Anonymous Auth with Invite Links
**What:** Create anonymous users, share household via invite token
**When:** First-time user experience
**Why:** Zero friction onboarding, convert to permanent later

**Example:**
```typescript
// Household creator flow
async function createHousehold() {
  const { data: { user } } = await supabase.auth.signInAnonymously()

  const { data: household } = await supabase
    .from('households')
    .insert({ owner_id: user.id })
    .select()
    .single()

  // Generate secure invite token
  const inviteToken = crypto.randomUUID()
  await supabase
    .from('invites')
    .insert({
      household_id: household.id,
      token: inviteToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })

  const inviteUrl = `${window.location.origin}/join/${inviteToken}`
  return inviteUrl
}

// Invite recipient flow
async function joinHousehold(token: string) {
  // Create anonymous user
  const { data: { user } } = await supabase.auth.signInAnonymously()

  // Lookup invite
  const { data: invite } = await supabase
    .from('invites')
    .select('household_id')
    .eq('token', token)
    .single()

  // Add as household member
  await supabase
    .from('household_members')
    .insert({
      household_id: invite.household_id,
      user_id: user.id
    })
}
```

### Pattern 5: Row-Level Security for Multi-Tenant Isolation
**What:** Use PostgreSQL RLS to enforce household data isolation
**When:** Every table with household data
**Why:** Backend security, not just client-side filtering

**Example:**
```sql
-- Enable RLS on items table
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see items from their households
CREATE POLICY "Users see own household items"
ON items FOR SELECT
USING (
  household_id IN (
    SELECT household_id
    FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can insert items to their households
CREATE POLICY "Users insert to own households"
ON items FOR INSERT
WITH CHECK (
  household_id IN (
    SELECT household_id
    FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Differentiate anonymous users (more restrictions)
CREATE POLICY "Permanent users can delete"
ON items FOR DELETE
USING (
  household_id IN (
    SELECT household_id
    FROM household_members
    WHERE user_id = auth.uid()
  )
  AND (auth.jwt() ->> 'is_anonymous')::boolean = false
);
```

### Pattern 6: Operation Queue for Offline Sync
**What:** Queue mutations in IndexedDB when offline, process on reconnection
**When:** All write operations
**Why:** Seamless offline experience with eventual consistency

**Example:**
```typescript
// lib/sync-engine.ts
import { openDB } from 'idb'

const db = await openDB('cartbuddy', 1, {
  upgrade(db) {
    db.createObjectStore('operation_queue', {
      keyPath: 'id',
      autoIncrement: true
    })
  }
})

export async function queueOperation(operation: Operation) {
  await db.add('operation_queue', {
    ...operation,
    timestamp: Date.now(),
    status: 'pending'
  })
}

export async function processQueue() {
  const operations = await db.getAllFromIndex('operation_queue', 'status', 'pending')

  for (const op of operations) {
    try {
      // Execute operation against Supabase
      const result = await executeOperation(op)

      // Mark as completed
      await db.put('operation_queue', { ...op, status: 'completed' })
    } catch (error) {
      // Detect conflicts
      if (error.code === 'CONFLICT') {
        await handleConflict(op, error)
      } else {
        // Retry later
        await db.put('operation_queue', {
          ...op,
          retryCount: (op.retryCount || 0) + 1
        })
      }
    }
  }
}

async function handleConflict(op: Operation, error: any) {
  // Last Write Wins strategy (simple)
  const serverVersion = error.serverData
  const clientVersion = op.data

  if (op.timestamp > serverVersion.updated_at) {
    // Client is newer, force update
    await supabase
      .from(op.table)
      .update(clientVersion)
      .eq('id', op.id)
  } else {
    // Server is newer, discard client change
    await db.put('operation_queue', { ...op, status: 'discarded' })
    toast.warning('Your change was overwritten by another user')
  }
}
```

### Pattern 7: Service Worker with Serwist for PWA
**What:** Cache static assets and app shell, enable offline page loads
**When:** Initial PWA setup
**Why:** App feels native, works offline immediately

**Example:**
```typescript
// next.config.mjs
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
})

export default withSerwist({
  // Next.js config
})

// app/sw.ts
import { defaultCache } from '@serwist/next/worker'
import { Serwist } from 'serwist'

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60 // 5 minutes
        }
      }
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-storage',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    }
  ]
})

serwist.addEventListeners()
```

### Pattern 8: Broadcast for Ephemeral State (Typing Indicators)
**What:** Use Realtime broadcast for temporary UI state that doesn't need persistence
**When:** Typing indicators, cursor positions, "user is viewing" status
**Why:** Reduces database load, faster than postgres_changes

**Example:**
```typescript
'use client'
import { useEffect, useState } from 'react'

export function TypingIndicator({ householdId, userId }) {
  const [typingUsers, setTypingUsers] = useState([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel(`household:${householdId}`)

    // Send typing event
    const sendTyping = () => {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: userId }
      })
    }

    // Receive typing events from others
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== userId) {
          setTypingUsers(prev => [...prev, payload.user_id])

          // Remove after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(id => id !== payload.user_id))
          }, 3000)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId, userId])

  return typingUsers.length > 0 && (
    <div className="text-sm text-gray-500">
      {typingUsers.length} {typingUsers.length === 1 ? 'person' : 'people'} typing...
    </div>
  )
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Realtime Subscriptions in Server Components
**What:** Attempting to subscribe to Realtime channels in Server Components
**Why bad:** Server Components render once on the server, cannot maintain WebSocket connections
**Instead:** Fetch initial data in Server Component, pass to Client Component for subscriptions

**Example (WRONG):**
```typescript
// app/page.tsx - Server Component ❌
export default async function Page() {
  const supabase = createClient()

  // This won't work - Server Components don't maintain connections
  supabase
    .channel('items')
    .on('postgres_changes', { ... }, (payload) => {
      // This callback never fires in Server Components
    })
    .subscribe()
}
```

**Example (CORRECT):**
```typescript
// app/page.tsx - Server Component ✅
export default async function Page() {
  const { data } = await supabase.from('items').select()
  return <RealtimeItems initialData={data} />
}

// components/realtime-items.tsx - Client Component ✅
'use client'
export function RealtimeItems({ initialData }) {
  // Subscribe here in Client Component
}
```

### Anti-Pattern 2: Over-Relying on Last Write Wins (LWW)
**What:** Using timestamps alone for conflict resolution without user awareness
**Why bad:** Silent data loss when concurrent edits occur
**Instead:** Detect conflicts, surface to user with merge UI or auto-merge with CRDT for list items

**Example (RISKY):**
```typescript
// Always overwrites without checking
await supabase
  .from('items')
  .update({ name: newName, updated_at: new Date() })
  .eq('id', itemId)
```

**Example (SAFER):**
```typescript
// Check version before update
const { data: current } = await supabase
  .from('items')
  .select('updated_at, version')
  .eq('id', itemId)
  .single()

if (current.version !== localVersion) {
  // Conflict detected - show merge UI
  showConflictDialog(current, localChanges)
} else {
  // Safe to update
  await supabase
    .from('items')
    .update({
      name: newName,
      updated_at: new Date(),
      version: current.version + 1
    })
    .eq('id', itemId)
    .eq('version', current.version) // Optimistic lock
}
```

### Anti-Pattern 3: Not Differentiating Anonymous Users in RLS
**What:** Treating anonymous and permanent users identically in RLS policies
**Why bad:** Anonymous users can be abused, should have restricted permissions
**Instead:** Check `is_anonymous` claim in JWT, restrict delete/admin operations

**Example (INSECURE):**
```sql
-- Allows anonymous users to delete anything ❌
CREATE POLICY "Users can delete items"
ON items FOR DELETE
USING (household_id IN (
  SELECT household_id FROM household_members WHERE user_id = auth.uid()
));
```

**Example (SECURE):**
```sql
-- Anonymous users cannot delete ✅
CREATE POLICY "Permanent users can delete items"
ON items FOR DELETE
USING (
  household_id IN (
    SELECT household_id FROM household_members WHERE user_id = auth.uid()
  )
  AND (auth.jwt() ->> 'is_anonymous')::boolean = false
);
```

### Anti-Pattern 4: Caching WebSocket Responses
**What:** Attempting to cache realtime WebSocket messages via Service Worker
**Why bad:** WebSocket protocol is not cacheable, breaks realtime functionality
**Instead:** Cache REST API responses only, let WebSocket be network-only

**Example (WRONG):**
```typescript
// sw.ts - Don't do this ❌
runtimeCaching: [
  {
    urlPattern: /.*\.supabase\.co.*/, // Too broad, includes WebSocket
    handler: 'CacheFirst'
  }
]
```

**Example (CORRECT):**
```typescript
// sw.ts - Cache only REST endpoints ✅
runtimeCaching: [
  {
    urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/, // Only REST
    handler: 'NetworkFirst',
    options: {
      networkTimeoutSeconds: 3
    }
  }
  // WebSocket connections are not cached
]
```

### Anti-Pattern 5: Missing CAPTCHA on Anonymous Sign-in
**What:** Enabling anonymous auth without rate limiting or CAPTCHA
**Why bad:** Attackers can create unlimited users, bloat database, exhaust quotas
**Instead:** Enable Cloudflare Turnstile or reCAPTCHA, set aggressive IP-based rate limits

**Example (VULNERABLE):**
```typescript
// No protection ❌
async function quickStart() {
  await supabase.auth.signInAnonymously()
}
```

**Example (PROTECTED):**
```typescript
// With CAPTCHA verification ✅
async function quickStart(captchaToken: string) {
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      captchaToken
    }
  })

  if (error?.message.includes('captcha')) {
    throw new Error('CAPTCHA verification failed')
  }
}

// In Supabase Dashboard:
// - Enable Cloudflare Turnstile
// - Set rate limit: 30 anonymous sign-ins per hour per IP
```

### Anti-Pattern 6: Client-Side User ID for RLS Checks
**What:** Passing user IDs from client and trusting them in queries
**Why bad:** Clients can manipulate IDs to access other users' data
**Instead:** Always use `auth.uid()` in RLS policies and server queries

**Example (INSECURE):**
```typescript
// Client sends userId ❌
const { data } = await supabase
  .from('items')
  .select()
  .eq('user_id', userIdFromClient) // Can be spoofed
```

**Example (SECURE):**
```typescript
// Server uses auth.uid() automatically via RLS ✅
const { data } = await supabase
  .from('items')
  .select()
// RLS policy filters by auth.uid() - no client input needed
```

### Anti-Pattern 7: Ignoring Operation Dependencies in Sync Queue
**What:** Processing offline operations in random order without checking dependencies
**Why bad:** Deleting an item before it's created causes errors
**Instead:** Process queue in timestamp order, track dependencies

**Example (BUGGY):**
```typescript
// Random order processing ❌
const operations = await db.getAll('operation_queue')
await Promise.all(operations.map(op => executeOperation(op)))
// Delete might run before Insert
```

**Example (CORRECT):**
```typescript
// Sequential processing with dependency tracking ✅
const operations = await db.getAll('operation_queue')
operations.sort((a, b) => a.timestamp - b.timestamp)

for (const op of operations) {
  // Check if operation depends on pending operations
  if (op.type === 'delete' && hasPendingInsert(op.item_id)) {
    continue // Skip, process after insert completes
  }

  await executeOperation(op)
}
```

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Database Connections** | Direct connections OK | Enable connection pooling (Supavisor) | Use Supavisor with transaction mode |
| **Realtime Subscriptions** | One channel per household | Still one channel per household (Realtime auto-scales) | Consider channel sharding if >100K concurrent |
| **Offline Sync Queue** | Simple LWW timestamps | Add version numbers for optimistic locking | Implement CRDT for shopping lists |
| **Static Assets** | Next.js default caching | CDN (Vercel Edge) | Multi-region CDN + image optimization |
| **RLS Performance** | Simple policies OK | Add indexes on household_id, user_id | Consider denormalized permission tables |
| **Anonymous User Cleanup** | Manual cleanup OK | Cron job to delete expired anonymous users | Partition anonymous users table by month |
| **Push Notifications** | Send directly to FCM | Batch notifications, queue with Bull | Use Supabase Edge Functions with job queue |

## Build Order Implications

### Phase 1: Core Database + Auth Foundation
**Build first because:** Everything depends on auth and schema
- Set up Supabase project
- Design PostgreSQL schema (households, members, items)
- Implement anonymous auth
- Configure RLS policies
- Add basic invite link generation

**Why this order:** Can't test any features without auth and data layer working

### Phase 2: Basic CRUD with Optimistic UI
**Build second because:** Establishes core user experience
- Create Next.js App Router structure (Server + Client Components)
- Implement useOptimistic for add/edit/delete items
- Build Server Components for initial data fetch
- Add PostgREST mutations
- Test round-trip (client → server → database → client)

**Why this order:** Proves the full stack works before adding complexity

### Phase 3: Realtime Sync Across Devices
**Build third because:** Depends on working CRUD, adds collaboration
- Implement Client Component WebSocket subscriptions
- Subscribe to postgres_changes on items table
- Handle INSERT/UPDATE/DELETE events
- Merge realtime updates with local state
- Test multi-device scenarios

**Why this order:** Need stable CRUD before adding realtime updates

### Phase 4: PWA Offline Support
**Build fourth because:** Requires working online experience first
- Integrate Serwist for service worker
- Cache static assets and app shell
- Set up IndexedDB operation queue
- Implement offline detection
- Add basic offline UI (banner)

**Why this order:** Offline is enhancement, not blocker for MVP

### Phase 5: Offline Sync Engine
**Build fifth because:** Most complex, requires all previous phases
- Build sync queue processing logic
- Implement conflict detection (timestamp comparison)
- Add Background Sync API integration
- Handle conflict resolution (LWW strategy for MVP)
- Test offline → online → sync flow

**Why this order:** Conflict resolution is complex, needs all other pieces working

### Phase 6: Advanced Features
**Build last because:** Polish and enhancements
- Push notifications (optional)
- Broadcast for typing indicators (optional)
- Convert anonymous to permanent user (optional)
- Advanced conflict resolution UI (optional)

**Why this order:** MVP works without these, add based on user feedback

### Dependency Graph
```
Phase 1 (Auth + Database)
  ↓
Phase 2 (CRUD + Optimistic UI)
  ↓
Phase 3 (Realtime Sync) ← Can work in parallel with Phase 4
  ↓                        ↓
Phase 5 (Offline Sync Engine)
  ↓
Phase 6 (Advanced Features)
```

## Research Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Supabase Realtime Architecture | HIGH | Official Supabase docs verified |
| Next.js Integration Patterns | HIGH | Official Next.js docs + Supabase guides |
| PWA Service Worker (Serwist) | HIGH | LogRocket 2026 guide + official Serwist docs |
| Optimistic UI Patterns | HIGH | React official docs (useOptimistic) + TanStack Query |
| Offline Sync Strategies | MEDIUM | Comprehensive 2026 guide found, but CartBuddy-specific needs require validation |
| Anonymous Auth Security | HIGH | Official Supabase security docs |
| Conflict Resolution | MEDIUM | General patterns documented, specific implementation needs testing |

## Sources

### Official Documentation
- [Realtime Architecture | Supabase Docs](https://supabase.com/docs/guides/realtime/architecture)
- [Using Realtime with Next.js | Supabase Docs](https://supabase.com/docs/guides/realtime/realtime-with-nextjs)
- [Architecture | Supabase Docs](https://supabase.com/docs/guides/getting-started/architecture)
- [Anonymous Sign-Ins | Supabase Docs](https://supabase.com/docs/guides/auth/auth-anonymous)
- [useOptimistic – React](https://react.dev/reference/react/useOptimistic)
- [Optimistic Updates | TanStack Query React Docs](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)

### 2026 Ecosystem Guides
- [Supabase MVP Architecture in 2026: Practical Patterns](https://www.valtorian.com/blog/supabase-mvp-architecture)
- [Build a Next.js 16 PWA with true offline support - LogRocket Blog](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
- [Offline sync & conflict resolution patterns — Architecture & Trade‑offs — Practical Guide (Feb 19, 2026) - Sachith Dassanayake](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/)
- [Progressive Web Apps 2026: PWA Performance Guide](https://www.digitalapplied.com/blog/progressive-web-apps-2026-pwa-performance-guide)
- [State Management in React (2026): Best Practices, Tools & Real-World Patterns](https://www.c-sharpcorner.com/article/state-management-in-react-2026-best-practices-tools-real-world-patterns/)
- [Building a Progressive Web App (PWA) in Next.js with Serwist (Next-PWA Successor) | JavaScript in Plain English](https://javascript.plainenglish.io/building-a-progressive-web-app-pwa-in-next-js-with-serwist-next-pwa-successor-94e05cb418d7)

### Security & Best Practices
- [Supabase Security Best Practices - Complete Guide 2026 | SupaExplorer](https://supaexplorer.com/guides/supabase-security-best-practices)
- [Supabase Auth Explained: Setup, Security & Best Practices | Rocket Blog](https://www.rocket.new/blog/supabase-auth-explained-setup-security-and-best-practices)

### Architecture Deep Dives
- [Building Scalable Real-Time Systems: A Deep Dive into Supabase Realtime Architecture and Optimistic UI Patterns | Medium](https://medium.com/@ansh91627/building-scalable-real-time-systems-a-deep-dive-into-supabase-realtime-architecture-and-eccb01852f2b)
- [Supabase Architecture Deep Dive: How the "Open Source Firebase Alternative" Really Works](https://bix-tech.com/supabase-architecture-deep-dive-how-the-open-source-firebase-alternative-really-works/)
