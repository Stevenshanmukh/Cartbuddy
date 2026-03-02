# CartBuddy

## What This Is

A mobile-first Progressive Web App (PWA) that enables roommates to collaboratively manage and complete shared shopping lists in real time. Lists are organized by store, with a dedicated "Shopping Mode" optimized for one-handed in-store use. Anonymous auth with invite links — no email/password required.

## Core Value

The fastest way for roommates to plan and complete shopping together. Adding an item must feel faster than sending a WhatsApp message.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Household System**
- [ ] User creates household with auto-generated invite link (UUID-based)
- [ ] User joins household via invite link by entering name
- [ ] Anonymous auth with local storage session persistence
- [ ] User can be member of one household at a time

**Store-Based Lists**
- [ ] Each household has multiple stores (Walmart, Costco, etc.)
- [ ] User can create, rename, delete stores
- [ ] Each store has its own list of items

**Item Management**
- [ ] Add item with name (required), quantity (optional), notes (optional)
- [ ] Edit item
- [ ] Delete item with undo (5-10 second window)
- [ ] Check/uncheck item with undo (5-10 second window)
- [ ] Items show "Added by [name]" tag
- [ ] Item states: active, checked, archived
- [ ] Bulk archive checked items after shopping

**Management Mode**
- [ ] View all stores and their items
- [ ] Compact list view
- [ ] Swipe-to-delete on mobile
- [ ] Quick add input pinned at bottom
- [ ] Activity feed showing last 20 actions

**Shopping Mode**
- [ ] Toggle between Management and Shopping modes
- [ ] Select single store to shop
- [ ] Show only active items for that store
- [ ] Large checkboxes (min 44px tap targets)
- [ ] High contrast, minimal distractions
- [ ] Checked items move to bottom, lightly faded
- [ ] One-hand usability

**Real-Time Sync**
- [ ] All changes sync to all household members instantly (<200ms perceived)
- [ ] Subscription-based WebSocket via Supabase Realtime
- [ ] Optimistic UI updates with server confirmation
- [ ] Automatic reconnection on socket drop

**Presence**
- [ ] Show number of people online
- [ ] Show who is currently shopping and which store
- [ ] Heartbeat every 15 seconds

**PWA**
- [ ] Installable on mobile
- [ ] Splash screen
- [ ] Offline fallback page
- [ ] Add to home screen support

**Phase 2: Offline & Polish**
- [ ] Full offline support with sync when reconnected
- [ ] Push notifications (new item added, someone starts shopping)
- [ ] Autocomplete suggestions for item names
- [ ] Recurring items
- [ ] UI animations and gesture improvements

### Out of Scope

- Email/password authentication — anonymous auth is intentional for MVP friction reduction
- Real-time chat — not core to shopping coordination
- Video/image attachments — text items only
- Cross-household features — one household per user
- Voice input — deferred to Phase 3
- AI purchase suggestions — deferred to Phase 3
- Store aisle grouping — deferred to Phase 3
- Spending/budget tracking — not a finance app

## Context

**Target Users:**
- Student roommates (3-5 people, informal coordination, low patience for complex apps)
- Young professionals (busy, need efficiency, want minimal UX)

**Pain Points Solved:**
- Duplicate purchases from lack of visibility
- Forgotten items
- Messy WhatsApp/text lists
- No visibility into who bought what
- Time wasted in-store

**Technical Environment:**
- Next.js with App Router
- React + Tailwind CSS
- Supabase (auth, database, realtime)
- PostgreSQL via Supabase
- PWA configuration (service worker, manifest.json)
- Supabase project needs to be created

**Database Schema (from spec):**
- users (id, name, created_at)
- households (id, name, invite_code, created_at)
- household_members (id, household_id, user_id, joined_at)
- stores (id, household_id, name, created_at)
- items (id, store_id, name, quantity, notes, status, created_by, created_at, updated_at)
- activity_logs (id, household_id, user_id, action, item_id, timestamp)

## Constraints

- **Performance**: Add item in <200ms, 60fps scrolling, no blocking loaders
- **Usability**: Add item in ≤2 taps, large touch targets (44px+), one-hand usage
- **Mobile-first**: Always design for mobile, desktop is secondary
- **Tech Stack**: Next.js, Supabase, Tailwind (specified in requirements)
- **Security**: Supabase RLS — users only access their household's data

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Anonymous auth over email/password | Minimize friction for roommate onboarding — enter name and go | — Pending |
| Store-based list organization | Matches real shopping behavior — you shop one store at a time | — Pending |
| Supabase over custom backend | Real-time subscriptions built-in, RLS for security, faster to build | — Pending |
| Checked items move to bottom (not hidden) | User still sees what was bought, provides satisfying visual progress | — Pending |
| Push notifications: new items + shopping start | High-value moments; checked items too noisy | — Pending |

---
*Last updated: 2026-03-02 after initialization*
