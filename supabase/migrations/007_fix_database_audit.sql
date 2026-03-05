-- =============================================
-- Migration 007: Database Audit Fixes
-- Fixes FK constraints, RLS policies
-- =============================================

-- Issue 1: Fix activity_logs.user_id FK to reference profiles instead of auth.users
-- This enables PostgREST to infer the join: profiles:user_id(name)
ALTER TABLE activity_logs 
  DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey,
  ADD CONSTRAINT activity_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Issue 3: Fix overly permissive invites UPDATE policy
-- Old policy allowed ANY authenticated user to update ANY invite
-- New policy scopes to household owner/admin only
DROP POLICY IF EXISTS "Authenticated users can update invites" ON invites;
DROP POLICY IF EXISTS "Owner or admin can update invites" ON invites;
CREATE POLICY "Owner or admin can update invites"
  ON invites FOR UPDATE
  USING (is_household_admin_or_owner(household_id));

-- Issue 5: Tighten items INSERT to validate created_by = auth.uid()
-- Prevents spoofing created_by to impersonate another user
DROP POLICY IF EXISTS "Members can add items" ON items;
CREATE POLICY "Members can add items"
  ON items FOR INSERT
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND store_id IN (
      SELECT id FROM stores
      WHERE household_id IN (SELECT get_my_household_ids())
    )
  );
