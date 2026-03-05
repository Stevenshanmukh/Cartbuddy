# 🛒 CartBuddy

**Real-time collaborative shopping lists for households.**

CartBuddy is a mobile-first PWA that lets roommates, families, and households manage shared shopping lists in real-time. Add items from anywhere, see who's shopping live, and never buy duplicates again.

---

## ✨ Features

- **Real-time sync** — Changes appear instantly across all household members
- **Live presence** — See who's currently shopping and at which store
- **Offline support** — Add items without internet, auto-syncs when back online
- **Multi-household** — Manage multiple households from one account
- **Smart quick-add** — Type `2x Milk` to auto-parse quantity
- **Undo actions** — 5-second undo toast for check/delete operations
- **Activity feed** — See who added, checked, or removed items
- **Invite system** — Share a link to invite household members
- **Installable PWA** — Add to home screen for native app experience

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Database** | Supabase (PostgreSQL + Realtime + Auth) |
| **State** | Zustand + React Query + Context API |
| **Styling** | Tailwind CSS 4 |
| **Validation** | Zod (client + server) |
| **Testing** | Vitest + Testing Library |
| **Offline** | IndexedDB queue + Service Worker (Serwist) |
| **UI** | Framer Motion + Lucide Icons + Vaul Drawer |
| **CI/CD** | GitHub Actions |

## 🏛 Architecture

```
Client (React)  →  Server Actions (Next.js)  →  Supabase (PostgreSQL)
     ↕                                               ↕
  IndexedDB                                    Realtime Channels
  (offline queue)                              (live sync + presence)
```

**Key patterns:**
- **Optimistic UI** — Items update instantly, roll back on error
- **Offline-first** — Mutations queue in IndexedDB, replay when online
- **Multi-tenant** — Row Level Security isolates household data
- **Atomic operations** — Ownership transfer uses PostgreSQL transactions

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project

### Setup

```bash
# 1. Clone and install
git clone https://github.com/Stevenshanmukh/Cartbuddy.git
cd Cartbuddy
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Set up database
# Run the SQL files in supabase/migrations/ (001 through 007) in your Supabase SQL Editor

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## 🔐 Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

See [`.env.example`](.env.example) for the full template.

## 🗄 Database Setup

Run these migrations in order in the Supabase SQL Editor:

| # | File | Purpose |
|---|------|---------|
| 1 | `001_create_tables.sql` | Core schema (profiles, households, items, etc.) |
| 2 | `002_enable_rls.sql` | Row Level Security policies |
| 3 | `003_create_indexes.sql` | Performance indexes |
| 4 | `004_seed_categories.sql` | Default shopping categories |
| 5 | `005_transfer_ownership_rpc.sql` | Atomic ownership transfer + invite count |
| 6 | `006_fix_invite_rls.sql` | Invite lookup policy |
| 7 | `007_fix_database_audit.sql` | FK fix (activity logs), RLS hardening |

## 🧪 Testing

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run type-check        # TypeScript strict check
npm run lint              # ESLint
```

## 📁 Project Structure

See [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) for the full annotated directory tree.

## 🤝 Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

## 📄 License

[MIT](LICENSE)
