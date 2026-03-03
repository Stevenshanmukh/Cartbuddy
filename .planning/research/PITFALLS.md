# Domain Pitfalls: Real-Time Collaborative Shopping List PWA

**Domain:** Real-time collaborative shopping list with Supabase Realtime
**Researched:** 2026-03-02
**Confidence:** HIGH

This document catalogs critical mistakes that real-time collaborative list apps commonly make when using Supabase, PWAs, and optimistic UI patterns. Each pitfall includes detection methods, prevention strategies, and phase-specific guidance.

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or major architectural issues.

### Pitfall 1: Missing RLS Policies Before Launch

**What goes wrong:** Tables are created without Row Level Security policies, or RLS is disabled during development and never enabled before production. This exposes all data to all authenticated users, creating a massive security vulnerability.

**Why it happens:** RLS adds friction during prototyping. Developers test with their own accounts and don't notice the security hole until production. Supabase Studio doesn't enforce RLS by default—tables start without policies.

**Consequences:**
- Any authenticated user can read/modify all shopping lists across all users
- Anonymous users (if enabled) can access everything marked `authenticated`
- Data breaches, GDPR violations, user trust destroyed
- Cannot fix with migration—requires rewriting queries and data model

**Prevention:**
1. Enable RLS on ALL tables immediately after creation, even during prototyping
2. Add `TO authenticated` clause to policies to exclude anonymous users by default
3. Use Security Advisor in Supabase dashboard before every deployment
4. Run security tests with multiple test accounts to verify isolation
5. Add pre-production checklist item: "Verify RLS enabled on all tables"

**Detection:**
- Run query: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;`
- Security Advisor in Supabase dashboard shows "RLS disabled" warnings
- Test with two different accounts—if you see other user's data, RLS is broken

**Phase impact:** Must be addressed in Phase 1 (MVP Core). Cannot defer.

**Source confidence:** HIGH - [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)

---

### Pitfall 2: Optimistic Updates Without Rollback Mechanism

**What goes wrong:** UI shows optimistic updates (item added/checked/deleted) but doesn't store previous state. When the server rejects the change (network error, validation failure, conflict), the UI stays in the wrong state. Users see phantom items or missing items.

**Why it happens:** Developers implement the happy path (optimistic update works) but forget error handling. State management doesn't track "pending" vs "confirmed" updates. No rollback mechanism exists.

**Consequences:**
- UI diverges from server state permanently until refresh
- Multi-user chaos: User A adds item, fails silently, User B never sees it
- Users lose trust in real-time sync ("the app is broken")
- Extremely hard to debug—race conditions, timing-dependent
- Violates your <200ms perceived latency target

**Prevention:**
1. **Always store previous state before optimistic update:**
   ```typescript
   // BAD
   setItems([...items, newItem]);

   // GOOD
   const previousItems = items;
   setItems([...items, newItem]);
   try {
     await supabase.from('items').insert(newItem);
   } catch (error) {
     setItems(previousItems); // Rollback
     showError('Failed to add item');
   }
   ```

2. Track pending state separately from confirmed state
3. Show visual indicator for pending updates (loading spinner, grey text)
4. Implement idempotent operations—retries don't duplicate data
5. Test with network throttling and offline mode

**Detection:**
- Turn off WiFi mid-operation—does UI show incorrect state?
- Simulate server rejection—does UI rollback?
- Check state management—is previous state stored before updates?
- DevTools Network tab → Throttle to Slow 3G → Try adding items

**Phase impact:** Phase 1 (MVP Core). Optimistic UI is in your requirements, so rollback must be built from start.

**Source confidence:** HIGH - [Optimistic UI in Frontend Architecture](https://javascript.plainenglish.io/optimistic-ui-in-frontend-architecture-do-it-right-avoid-pitfalls-7507d713c19c), [Why I Never Use Optimistic Updates](https://dev.to/criscmd/why-i-never-use-optimistic-updates-and-why-you-might-regret-it-too-4jem)

---

### Pitfall 3: Overly Complex RLS Policies Killing Performance

**What goes wrong:** RLS policies contain complex subqueries, function calls on every row, or joins without indexes. Queries that should take 10ms take 2000ms. Performance targets (<200ms) become impossible to meet.

**Why it happens:** Developers use RLS as their primary filtering mechanism instead of a security layer. Policies like `auth.uid() IN (SELECT user_id FROM team_user WHERE team_user.team_id = table.team_id)` run the subquery on EVERY row.

**Consequences:**
- List loads take 2-5 seconds instead of <200ms
- Real-time updates lag by seconds
- Database CPU spikes to 100%
- 60fps scrolling target impossible—UI freezes
- Scales poorly—works with 10 items, breaks with 1000

**Prevention:**
1. **Index all columns used in RLS policies** (most critical—100x improvement possible)
   ```sql
   CREATE INDEX idx_items_list_id ON items(list_id);
   CREATE INDEX idx_list_users_user_id ON list_users(user_id);
   ```

2. **Wrap functions in SELECT to enable caching:**
   ```sql
   -- BAD: auth.uid() called on every row
   CREATE POLICY "Users see own lists" ON lists
   FOR SELECT USING (user_id = auth.uid());

   -- GOOD: auth.uid() called once
   CREATE POLICY "Users see own lists" ON lists
   FOR SELECT USING (user_id IN (SELECT auth.uid()));
   ```

3. **Add application-level filters alongside RLS:**
   ```typescript
   // Don't rely solely on RLS for filtering
   const { data } = await supabase
     .from('items')
     .select('*')
     .eq('list_id', listId); // Explicit filter + RLS security
   ```

4. **Use security definer functions to bypass RLS on join tables**
5. Test with `EXPLAIN ANALYZE` on queries with 1000+ rows
6. Optimize join queries: filter by known values, not per-row checks

**Detection:**
- Run `EXPLAIN ANALYZE` on your queries—look for Seq Scan, high row counts
- Enable slow query logging—anything >50ms is suspect
- Profile with Supabase Performance Advisor
- Test with realistic data volume (1000+ items, 100+ lists)

**Phase impact:** Phase 1 (MVP Core). Performance targets are in requirements, so RLS must be optimized from start.

**Source confidence:** HIGH - [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

---

### Pitfall 4: Last-Write-Wins Without Considering Data Loss

**What goes wrong:** Two users edit the same item simultaneously. Both send updates to server. Last update overwrites the first—User A's changes silently disappear. No conflict detection, no merge logic, no user notification.

**Why it happens:** LWW is the easiest conflict resolution strategy. Developers assume conflicts are rare. PowerSync and similar tools default to LWW. Teams ship without testing concurrent edits.

**Consequences:**
- Silent data loss—users don't know their changes were lost
- For shopping lists: items mysteriously unchecked, quantities wrong, notes deleted
- Erodes trust in real-time sync
- Cannot be fixed after launch—requires architectural change
- Violates user expectations for collaborative apps

**Prevention:**
1. **Acknowledge that LWW WILL lose data in concurrent scenarios**—design around it:
   - For shopping lists, LWW is acceptable for: item checked/unchecked, quantity changes
   - For shopping lists, LWW is NOT acceptable for: item deletions, note edits, category changes

2. **Use field-level versioning for critical fields:**
   ```sql
   ALTER TABLE items ADD COLUMN notes_updated_at TIMESTAMPTZ;
   -- Only update notes if our version is newer
   UPDATE items SET notes = $1, notes_updated_at = NOW()
   WHERE id = $2 AND notes_updated_at < NOW();
   ```

3. **Show "Someone else is editing" indicators:**
   - Track active editors via presence in Supabase Realtime
   - Lock items being edited (pessimistic locking)
   - Warn users before overwriting recent changes

4. **For critical operations, use optimistic locking:**
   ```typescript
   const { data, error } = await supabase
     .from('items')
     .update({ name: newName, version: version + 1 })
     .eq('id', itemId)
     .eq('version', version); // Fails if version changed

   if (error || !data.length) {
     // Conflict detected—fetch latest and retry or show conflict UI
   }
   ```

5. **Test with two browsers open, editing simultaneously**

**Detection:**
- Open two browsers, edit same item simultaneously—are changes lost?
- Check for version columns, conflict detection logic in codebase
- Review real-time subscription handlers—do they handle conflicts?

**Phase impact:** Phase 1 (MVP Core) for basic conflict awareness. Phase 2+ for advanced conflict UI.

**Source confidence:** HIGH - [Last-Write-Wins in Distributed Systems](https://www.numberanalytics.com/blog/last-writer-wins-distributed-systems), [Offline sync & conflict resolution patterns](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/)

---

### Pitfall 5: Anonymous Auth Database Flooding

**What goes wrong:** Anonymous authentication is enabled without rate limiting or CAPTCHA. Bots create thousands of anonymous accounts per hour, flooding your database with garbage data. Database size balloons, costs spike, performance degrades.

**Why it happens:** Anonymous auth is enabled for "frictionless onboarding" without considering abuse. Supabase defaults (30 req/hour per IP) aren't enough against distributed bots. Teams forget to enable cleanup.

**Consequences:**
- Database grows to GBs of bot-generated lists/items
- Free tier quota exhausted in hours
- Real users hit rate limits due to bot traffic
- Manual cleanup required—no automatic deletion
- Emergency mitigation requires disabling anonymous auth (breaks product)

**Prevention:**
1. **Enable invisible CAPTCHA or Cloudflare Turnstile** (Supabase recommendation)
2. **Lower rate limit** from 30 req/hour to 5-10 req/hour per IP
3. **Add RLS policies that check `is_anonymous` claim:**
   ```sql
   -- Limit anonymous users to 10 lists
   CREATE POLICY "Anonymous users limited lists" ON lists
   FOR INSERT WITH CHECK (
     CASE
       WHEN (auth.jwt() ->> 'is_anonymous')::boolean
       THEN (SELECT COUNT(*) FROM lists WHERE user_id = auth.uid()) < 10
       ELSE true
     END
   );
   ```

4. **Implement automatic cleanup:**
   - Daily cron job to delete anonymous users inactive >7 days
   - Use Supabase Edge Functions or external scheduler
   - Delete cascade to remove associated lists/items

5. **Monitor anonymous user growth** in dashboard—alert if >100/day

**Detection:**
- Check `auth.users` table for `is_anonymous = true` growth rate
- Monitor database size—sudden growth indicates abuse
- Review logs for rapid anonymous signups from same IP ranges

**Phase impact:** Phase 1 (MVP Core). Anonymous auth is in requirements, so abuse prevention must be built immediately.

**Source confidence:** HIGH - [Supabase Anonymous Sign-Ins Docs](https://supabase.com/docs/guides/auth/auth-anonymous), [Security of Anonymous Sign-ins](https://supabase.com/docs/guides/troubleshooting/security-of-anonymous-sign-ins-iOrGCL)

---

## Moderate Pitfalls

Mistakes that cause delays, tech debt, or performance issues but are fixable.

### Pitfall 6: Not Handling Realtime Reconnection Gracefully

**What goes wrong:** User backgrounds the app, connection drops silently. When they return, app shows stale data. Real-time updates don't resume automatically. Or reconnection logic hammers server with constant retries.

**Why it happens:** Supabase Realtime disconnects on mobile background, tab blur, network change. Default reconnection is naive (fixed interval). Developers don't implement exponential backoff or heartbeat monitoring.

**Consequences:**
- Stale data shown after reconnection
- Changes made during offline period are lost
- Server overwhelmed by simultaneous reconnection during outages
- Battery drain from constant reconnection attempts
- Users don't trust "real-time" claims

**Prevention:**
1. **Implement exponential backoff with jitter:**
   - Initial delay: 1000ms, max delay: 30000ms, multiplier: 2
   - Add random jitter (10%) to prevent thundering herd
   - Reset backoff on successful connection

2. **Monitor connection state explicitly:**
   ```typescript
   supabase.channel('list')
     .on('system', { event: 'heartbeat' }, () => {
       // Connection alive
     })
     .on('system', { event: 'error' }, (error) => {
       // Handle disconnection
     })
     .subscribe();
   ```

3. **Refetch data after reconnection:**
   ```typescript
   channel.on('system', { event: 'online' }, async () => {
     // Refetch latest data to catch missed updates
     await refetchList();
   });
   ```

4. **Show connection status to user:**
   - Green dot: connected
   - Yellow: reconnecting
   - Red: offline (with manual retry button)

5. **Queue offline writes** to replay on reconnection

**Detection:**
- Background app for 5 minutes → return → are updates shown?
- Turn off WiFi → turn on → does reconnection work?
- Check DevTools console for reconnection loops
- Test on iOS—backgrounding kills connections aggressively

**Phase impact:** Phase 1 (MVP Core) for basic reconnection. Phase 2 for advanced queuing/retry logic.

**Source confidence:** HIGH - [Supabase Realtime Troubleshooting](https://supabase.com/docs/guides/realtime/troubleshooting), [WebSocket Reconnection Strategies](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1)

---

### Pitfall 7: IndexedDB Transaction Deadlocks in Offline Mode

**What goes wrong:** Offline writes queue up in IndexedDB. Transaction is started, async operation (fetch, setTimeout) is called mid-transaction, transaction auto-commits before operation completes. Data corruption or deadlock when trying to sync.

**Why it happens:** IndexedDB transactions are short-lived by design. Developers use async operations inside transactions (not allowed). Multiple parts of app try to write simultaneously. No transaction batching.

**Consequences:**
- Offline writes fail silently
- Data inconsistency between IndexedDB and Supabase
- Sync fails when coming back online
- App crashes or freezes during sync
- Users lose offline work

**Prevention:**
1. **Never use async operations mid-transaction:**
   ```typescript
   // BAD
   const tx = db.transaction(['items'], 'readwrite');
   await fetch('/api/validate'); // Transaction commits here!
   tx.objectStore('items').add(item); // Fails—transaction closed

   // GOOD
   const validationResult = await fetch('/api/validate');
   const tx = db.transaction(['items'], 'readwrite');
   tx.objectStore('items').add(item);
   ```

2. **Batch writes into single transaction:**
   ```typescript
   // Process queue in batches
   const tx = db.transaction(['items'], 'readwrite');
   for (const item of queuedItems) {
     tx.objectStore('items').add(item);
   }
   await tx.complete;
   ```

3. **Use transaction wrappers that handle errors:**
   - Consider libraries like `idb` (Jake Archibald) that provide Promise wrappers
   - Implement retry logic with exponential backoff

4. **Set transaction durability to 'relaxed' for performance:**
   ```typescript
   const tx = db.transaction(['items'], 'readwrite', { durability: 'relaxed' });
   ```

5. **Limit concurrent transactions**—queue writes if transaction in progress

**Detection:**
- Go offline → add 50 items quickly → go online → do all items sync?
- Check browser console for "TransactionInactiveError"
- Use Chrome DevTools → Application → IndexedDB inspector
- Test with slow device (throttled CPU)

**Phase impact:** Phase 2+ (Offline Support). Not needed for MVP if offline is deferred.

**Source confidence:** MEDIUM - [Solving IndexedDB Slowness](https://rxdb.info/slow-indexeddb.html), [The pain and anguish of using IndexedDB](https://gist.github.com/pesterhazy/4de96193af89a6dd5ce682ce2adff49a)

---

### Pitfall 8: iOS PWA Limitations Break Core Features

**What goes wrong:** PWA works perfectly on Android/desktop. Ships to production. iOS users report: push notifications don't work, background sync fails, cache randomly clears, offline mode broken after app restart.

**Why it happens:** iOS support for PWAs is limited. Background Sync API not supported. Cache is volatile (cleared to save space). Push notifications require iOS 16.4+ and have restrictions. Developers test on desktop Safari, miss mobile Safari differences.

**Consequences:**
- Push notifications feature doesn't work on iOS (50% of mobile users)
- Offline mode unreliable—cache cleared without warning
- Background sync impossible—must sync in foreground
- User complaints: "app doesn't work on iPhone"
- Emergency workaround: redirect iOS users to native app (expensive)

**Prevention:**
1. **Test on actual iOS device early** (not just desktop Safari)
2. **Design for iOS limitations from start:**
   - No Background Sync API → use foreground sync only
   - Volatile cache → re-cache critical assets on app launch
   - Push notifications require user action → can't send silently

3. **Implement cache warming on startup:**
   ```typescript
   // Re-cache on every launch (iOS clears cache)
   self.addEventListener('activate', async () => {
     const cache = await caches.open('v1');
     await cache.addAll(['/critical-assets.js', '/app.html']);
   });
   ```

4. **Show fallback UI for unsupported features:**
   ```typescript
   if (!('sync' in window.navigator)) {
     // Show "Sync manually" button instead of background sync
   }
   ```

5. **Prioritize essential resources in cache** (iOS has stricter quotas)

**Detection:**
- Test on iPhone/iPad running latest iOS
- Check `caniuse.com` for "Background Sync", "Push API" on iOS
- Monitor cache size in iOS—does it persist across app restarts?
- Test push notifications on iOS 16.4+ and iOS <16.4

**Phase impact:** Phase 1 (MVP Core) for awareness. Phase 3+ for push notifications (iOS support required).

**Source confidence:** HIGH - [PWA iOS Limitations and Safari Support](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide), [Do Progressive Web Apps Work on iOS?](https://www.mobiloud.com/blog/progressive-web-apps-ios)

---

### Pitfall 9: Realtime Channel Leaks Exhausting Connections

**What goes wrong:** Component subscribes to Realtime channel on mount. Developer forgets cleanup in `useEffect`. Component re-renders or unmounts. Old channel stays open. After multiple renders, hundreds of channels are open. "TooManyChannels" error, connections exhausted.

**Why it happens:** React strict mode calls effects twice. Hot reload during development creates new channels. Developers forget `return () => channel.unsubscribe()` in useEffect cleanup. No monitoring of active channels.

**Consequences:**
- App hits connection limit (varies by Supabase plan)
- New users can't connect—"TooManyChannels" error
- Performance degrades—each channel consumes resources
- Billing spikes from connection overages
- Memory leaks in browser

**Prevention:**
1. **Always cleanup channels in useEffect:**
   ```typescript
   useEffect(() => {
     const channel = supabase
       .channel(`list:${listId}`)
       .on('postgres_changes', { ... }, handleChange)
       .subscribe();

     return () => {
       supabase.removeChannel(channel); // Critical cleanup
     };
   }, [listId]);
   ```

2. **Use a single channel per list/resource** (not per component)
   ```typescript
   // Share channel via context or global store
   const channel = getOrCreateChannel(listId);
   ```

3. **Monitor active channels in development:**
   ```typescript
   console.log('Active channels:', supabase.getChannels().length);
   ```

4. **Set up alerts** for channel count > expected (e.g., >10 per user)

5. **Test with React strict mode enabled** (it will expose leaks)

**Detection:**
- Check browser console for "TooManyChannels" errors
- Monitor Supabase dashboard → Realtime → Concurrent connections
- Inspect `supabase.getChannels().length` after navigation
- Refresh page multiple times—does channel count increase?

**Phase impact:** Phase 1 (MVP Core). Real-time is core feature, so channel management must be correct from start.

**Source confidence:** HIGH - [Supabase Realtime Troubleshooting](https://supabase.com/docs/guides/realtime/troubleshooting)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable without major rework.

### Pitfall 10: Not Wrapping auth.uid() in SELECT for RLS

**What goes wrong:** RLS policy calls `auth.uid()` directly. Postgres optimizer can't cache the result. Function is called on every row. Performance degrades on large tables (e.g., 1000+ items).

**Why it happens:** Supabase examples show `auth.uid()` directly in policies. It "just works" for small datasets. Developers don't know about the SELECT wrapper optimization.

**Consequences:**
- Queries 2-10x slower than necessary
- Scales poorly (works with 100 rows, slow with 1000+)
- Database CPU usage higher than needed

**Prevention:**
```sql
-- BAD: auth.uid() called on every row
CREATE POLICY "Users see own items" ON items
FOR SELECT USING (user_id = auth.uid());

-- GOOD: auth.uid() called once, result cached
CREATE POLICY "Users see own items" ON items
FOR SELECT USING (user_id IN (SELECT auth.uid()));
```

**Detection:**
- Run `EXPLAIN ANALYZE` on query—look for multiple `auth.uid()` calls
- Performance degrades linearly with row count

**Phase impact:** Phase 1 (MVP Core) for performance. Easy to fix during initial policy creation.

**Source confidence:** HIGH - [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

---

### Pitfall 11: Service Worker Update Without User Notification

**What goes wrong:** New service worker version is deployed. Old version continues running in user's browser. New features don't appear. User sees stale UI. No notification that update is available.

**Why it happens:** Service workers wait for all tabs to close before updating. Developers don't implement update notification. Users keep tabs open for days.

**Consequences:**
- Users report "new feature not working" (they're on old version)
- Support burden—hard to diagnose version mismatches
- Confusing UX—some users see new UI, others see old UI
- Cache inconsistency if data schema changed

**Prevention:**
1. **Detect service worker updates:**
   ```typescript
   navigator.serviceWorker.register('/sw.js').then(reg => {
     reg.addEventListener('updatefound', () => {
       const newWorker = reg.installing;
       newWorker.addEventListener('statechange', () => {
         if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
           // New version available
           showUpdateToast();
         }
       });
     });
   });
   ```

2. **Show toast notification:**
   ```typescript
   function showUpdateToast() {
     // "New version available. Refresh to update."
     // User clicks → reload page
   }
   ```

3. **Optionally auto-update on next navigation** (less disruptive than forced reload)

**Detection:**
- Deploy new version → keep tab open → check if update prompt appears
- Check for `updatefound` event listener in codebase

**Phase impact:** Phase 2+ (PWA polish). Not critical for MVP.

**Source confidence:** MEDIUM - [Progressive Web Apps 2026: PWA Performance Guide](https://www.digitalapplied.com/blog/progressive-web-apps-2026-pwa-performance-guide)

---

### Pitfall 12: Forgetting to Add Indexes on Foreign Keys

**What goes wrong:** `items` table has `list_id` foreign key. No index on `list_id`. Query for `SELECT * FROM items WHERE list_id = $1` does sequential scan. Performance degrades as items table grows.

**Why it happens:** Developers assume foreign keys automatically create indexes (not true in Postgres). Supabase Studio doesn't auto-create indexes on FKs. Works fine with test data (100 rows), breaks in production (10000+ rows).

**Consequences:**
- List loads become slower over time
- Performance cliff when table hits ~1000 rows
- 60fps scrolling impossible—queries take 500ms+
- Database CPU spikes

**Prevention:**
1. **Create indexes on ALL foreign key columns:**
   ```sql
   CREATE INDEX idx_items_list_id ON items(list_id);
   CREATE INDEX idx_list_users_user_id ON list_users(user_id);
   CREATE INDEX idx_list_users_list_id ON list_users(list_id);
   ```

2. **Use index advisor** in Supabase to identify missing indexes
3. **Run `EXPLAIN ANALYZE` on queries**—look for Seq Scan warnings
4. **Test with realistic data volumes** (10000+ rows)

**Detection:**
- `EXPLAIN SELECT * FROM items WHERE list_id = $1;` → shows Seq Scan
- Query time increases linearly with table size
- Database logs show slow queries

**Phase impact:** Phase 1 (MVP Core). Critical for performance targets.

**Source confidence:** HIGH - [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Phase 1: MVP Core** | Missing RLS policies | Enable RLS on all tables immediately, run Security Advisor before first deploy |
| **Phase 1: MVP Core** | Optimistic UI without rollback | Store previous state, implement error handling from start |
| **Phase 1: MVP Core** | Slow RLS policies | Index all FK columns, wrap auth.uid() in SELECT, test with 1000+ rows |
| **Phase 1: MVP Core** | Channel leaks | Add cleanup in useEffect, monitor channel count in dev |
| **Phase 1: MVP Core** | Anonymous auth abuse | Enable CAPTCHA, lower rate limits, implement cleanup cron |
| **Phase 2: Offline Support** | IndexedDB transaction deadlocks | Batch writes, use transaction wrappers, test offline workflows |
| **Phase 2: Offline Support** | iOS cache clearing | Re-cache on launch, prioritize critical assets, test on real iOS device |
| **Phase 2: Real-time Polish** | Reconnection storms | Exponential backoff with jitter, refetch on reconnect |
| **Phase 3: Push Notifications** | iOS push limitations | Require iOS 16.4+, show fallback for older versions, test on actual devices |
| **Phase 3: Collaboration UX** | LWW data loss | Add conflict detection for critical fields, show edit indicators |

---

## Testing Checklist to Detect Pitfalls Early

**Security:**
- [ ] Query `pg_tables` for tables with `rowsecurity = false`
- [ ] Run Supabase Security Advisor before each deployment
- [ ] Test with two accounts—verify data isolation
- [ ] Enable anonymous auth → create 100 accounts → check rate limiting

**Performance:**
- [ ] Run `EXPLAIN ANALYZE` on all queries with >50ms response time
- [ ] Test with 1000+ items in a list, 100+ lists per user
- [ ] Profile with Chrome DevTools Performance tab—check for 60fps
- [ ] Check Supabase dashboard for slow queries (>50ms)

**Real-time:**
- [ ] Background app for 5 min → return → verify reconnection and data refresh
- [ ] Turn off WiFi → make changes → turn on → verify sync
- [ ] Check `supabase.getChannels().length` after navigation—should not grow
- [ ] Test with two browsers simultaneously editing same item

**Offline/PWA:**
- [ ] Go offline → add 50 items → go online → verify all items sync
- [ ] Test on iOS device—verify cache persistence across app restarts
- [ ] Check for `TransactionInactiveError` in browser console
- [ ] Deploy new service worker → verify update toast appears

**Optimistic UI:**
- [ ] Simulate network error mid-update → verify rollback
- [ ] Add item → immediately refresh page → verify item persisted
- [ ] Throttle network to Slow 3G → verify loading states

---

## Common Root Causes Across Pitfalls

**1. Testing with unrealistic data:**
- Test with 10 items → works fine
- Production with 1000 items → breaks
- **Solution:** Seed test DB with 10000+ rows

**2. Testing on desktop only:**
- Works on Chrome desktop
- Breaks on iOS Safari
- **Solution:** Test on actual iOS/Android devices

**3. Not testing multi-user scenarios:**
- Works with single user
- Breaks with simultaneous edits
- **Solution:** Open two browsers, edit simultaneously

**4. Assuming default behavior is optimal:**
- RLS not enabled by default
- Indexes not created on FKs
- Service worker doesn't auto-update
- **Solution:** Explicit configuration, checklists

**5. Not monitoring production metrics:**
- Channel leaks, slow queries go unnoticed
- **Solution:** Set up alerts for channel count, query latency, error rates

---

## Sources

### High Confidence (Official Documentation & Recent Guides)
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase Realtime Troubleshooting](https://supabase.com/docs/guides/realtime/troubleshooting)
- [Supabase Anonymous Sign-Ins Docs](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Security of Anonymous Sign-ins](https://supabase.com/docs/guides/troubleshooting/security-of-anonymous-sign-ins-iOrGCL)

### Medium Confidence (Recent Technical Articles - 2026)
- [What Actually Breaks First in Supabase Apps](https://medium.com/@tagorenathv/what-actually-breaks-first-in-supabase-apps-1fb403ca63ce)
- [Optimistic UI in Frontend Architecture: Do It Right, Avoid Pitfalls](https://javascript.plainenglish.io/optimistic-ui-in-frontend-architecture-do-it-right-avoid-pitfalls-7507d713c19c)
- [Offline sync & conflict resolution patterns — Practical Guide (Feb 19, 2026)](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/)
- [WebSocket Reconnection Strategies with Exponential Backoff](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1)
- [How to Implement Reconnection Logic for WebSockets (2026)](https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection-logic/view)
- [Last-Write-Wins in Distributed Systems](https://www.numberanalytics.com/blog/last-writer-wins-distributed-systems)
- [PWA iOS Limitations and Safari Support: Complete Guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Do Progressive Web Apps Work on iOS? The Complete Guide for 2026](https://www.mobiloud.com/blog/progressive-web-apps-ios)
- [Progressive Web Apps 2026: PWA Performance Guide](https://www.digitalapplied.com/blog/progressive-web-apps-2026-pwa-performance-guide)

### Supporting Resources (Community Insights)
- [Why I Never Use Optimistic Updates](https://dev.to/criscmd/why-i-never-use-optimistic-updates-and-why-you-might-regret-it-too-4jem)
- [Solving IndexedDB Slowness](https://rxdb.info/slow-indexeddb.html)
- [The pain and anguish of using IndexedDB](https://gist.github.com/pesterhazy/4de96193af89a6dd5ce682ce2adff49a)
- [Supabase Best Practices for Security, Scaling & Maintainability](https://www.leanware.co/insights/supabase-best-practices)
- [3 Biggest Mistakes Using Supabase](https://medium.com/@lior_amsalem/3-biggest-mistakes-using-supabase-854fe45712e3)
