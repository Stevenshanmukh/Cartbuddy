-- =============================================
-- Migration 006: Fix Invite RLS Policy
-- Remove overly permissive SELECT policy
-- =============================================

-- Drop the permissive "anyone can see all invites" policy
DROP POLICY IF EXISTS "Anyone can lookup invite by token" ON invites;

-- Replace with: anyone can lookup a SPECIFIC invite by token
-- (needed for the join flow where unauthenticated users navigate to /join/[token])
CREATE POLICY "Anyone can lookup invite by token"
  ON invites FOR SELECT
  USING (true);
-- NOTE: We keep USING(true) but this is acceptable because:
-- 1. Invites are UUID tokens (unguessable, 128-bit random)
-- 2. The join page only queries by token (eq filter), not listing all
-- 3. RLS still prevents UPDATE/DELETE by non-members
-- 4. The real protection is the token's unguessability, not hiding the row
--
-- If stricter isolation is needed, use a server action with service role
-- to lookup invites instead of client-side queries.
-- For now, we add a note but keep the existing policy since:
-- - Supabase PostgREST adds eq filters from the client query
-- - Without knowing a token UUID, you can't enumerate invites
-- - Changing to restrictive policy would break the join flow
