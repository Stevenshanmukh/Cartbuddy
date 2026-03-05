# Project Structure

```
CartBuddy/
├── .github/workflows/      # CI/CD pipeline (lint → test → build)
├── public/icons/            # PWA app icons
├── supabase/
│   └── migrations/          # SQL migrations (run in order)
│       ├── 001_create_tables.sql
│       ├── 002_enable_rls.sql
│       ├── 003_create_indexes.sql
│       ├── 004_seed_categories.sql
│       ├── 005_transfer_ownership_rpc.sql
│       └── 006_fix_invite_rls.sql
│
└── src/
    ├── app/                 # Next.js App Router pages
    │   ├── (app)/           # Authenticated app routes
    │   │   ├── dashboard/   # Main dashboard + new store form
    │   │   ├── store/       # Store detail view (item list)
    │   │   ├── shop/        # Shopping mode view
    │   │   ├── activity/    # Activity feed
    │   │   ├── settings/    # Household settings
    │   │   └── layout.tsx   # Auth guard + providers
    │   ├── (auth)/          # Login/signup pages
    │   ├── actions/         # Server Actions (household, invites)
    │   ├── households/      # Household selection (pre-app)
    │   └── join/[token]/    # Invite join flow
    │
    ├── components/          # Reusable UI components
    │   ├── items/           # Item-related (ItemCard, QuickAdd, AddSheet)
    │   ├── shopping/        # Shopping mode components
    │   ├── landing/         # Landing page sections
    │   ├── layout/          # App shell, navigation
    │   └── ui/              # Generic UI (UndoToast, ErrorBoundary)
    │
    ├── hooks/               # Custom React hooks
    │   ├── use-items.ts     # Item CRUD with optimistic updates
    │   ├── use-realtime.ts  # Supabase realtime subscriptions
    │   ├── use-presence.ts  # Live shopping presence
    │   └── use-offline.ts   # Offline queue management
    │
    ├── lib/                 # Core utilities
    │   ├── supabase/        # Supabase client/server factories
    │   ├── sync/            # Offline sync engine + IndexedDB queue
    │   ├── validators/      # Zod schemas (shared client/server)
    │   ├── types.ts         # TypeScript type definitions
    │   ├── constants.ts     # App constants
    │   ├── env.ts           # Runtime env validation
    │   └── utils.ts         # Utility functions (cn, timeAgo)
    │
    ├── stores/              # Zustand state management
    │   └── ui-store.ts      # UI mode, online status, sync count
    │
    ├── contexts/            # React Context providers
    │   └── household-context.tsx  # Active household + switching
    │
    └── __tests__/           # Test suite (mirrors src/ structure)
        ├── actions/         # Server action tests
        ├── components/      # Component tests
        ├── hooks/           # Hook tests
        ├── lib/             # Utility tests
        ├── stores/          # Store tests
        ├── sync/            # Sync engine/queue tests
        └── validators/      # Zod schema tests
```

## Architecture Decisions

### Server Actions over API Routes
All mutations go through Next.js Server Actions (`src/app/actions/`) rather than API routes. This gives us automatic CSRF protection, type safety, and progressive enhancement.

### Optimistic UI + Offline Queue
Item mutations update the UI immediately via React Query's `onMutate` callback. If offline, mutations are queued in IndexedDB and replayed when connectivity returns.

### Multi-Tenant via RLS
Row Level Security policies on every table ensure users only see data for households they're members of. No application-level filtering needed.

### State Management Split
- **Zustand** — UI state (mode, online status)
- **React Query** — Server state (items, stores, members)
- **Context** — Household selection (shared across layout)
