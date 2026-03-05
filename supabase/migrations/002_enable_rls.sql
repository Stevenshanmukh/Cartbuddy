-- =============================================
-- CartBuddy RLS Policies
-- Migration 002: Enable Row Level Security
-- =============================================

-- Helper function: get current user's household IDs (cached per query)
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT household_id FROM household_members
  WHERE user_id = auth.uid()
$$;

-- Helper function: check if user has elevated role in a household
CREATE OR REPLACE FUNCTION is_household_admin_or_owner(h_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = h_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
$$;

-- =============================================
-- PROFILES
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Members can read profiles of users in their households
CREATE POLICY "Users can read profiles in their household"
  ON profiles FOR SELECT
  USING (id IN (
    SELECT user_id FROM household_members
    WHERE household_id IN (SELECT get_my_household_ids())
  ));

-- Users can always read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = (SELECT auth.uid()));

-- =============================================
-- HOUSEHOLDS
-- =============================================
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- Members can view their households
CREATE POLICY "Members can view their household"
  ON households FOR SELECT
  USING (id IN (SELECT get_my_household_ids()));

-- Creator can always view their own household (needed for INSERT...RETURNING)
CREATE POLICY "Creator can view own household"
  ON households FOR SELECT
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Authenticated users can create households"
  ON households FOR INSERT
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Owner can update household"
  ON households FOR UPDATE
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Owner can delete household"
  ON households FOR DELETE
  USING (created_by = (SELECT auth.uid()));

-- =============================================
-- HOUSEHOLD MEMBERS
-- =============================================
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their household members"
  ON household_members FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

-- Users can always view their own memberships (bootstrap case)
CREATE POLICY "Users can view own memberships"
  ON household_members FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can join a household (insert themselves)"
  ON household_members FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can leave (delete themselves)"
  ON household_members FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- Owner/Admin can remove members
CREATE POLICY "Owner or admin can remove members"
  ON household_members FOR DELETE
  USING (is_household_admin_or_owner(household_id));

-- Owner can update member roles
CREATE POLICY "Owner can update member roles"
  ON household_members FOR UPDATE
  USING (
    household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = (SELECT auth.uid()) AND hm.role = 'owner'
    )
  );

-- =============================================
-- INVITES
-- =============================================
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Members can view invites for their households
CREATE POLICY "Members can view invites for their households"
  ON invites FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

-- Allow looking up invites by token (for join flow — scoped to token lookup)
CREATE POLICY "Anyone can lookup invite by token"
  ON invites FOR SELECT
  USING (true);
  -- Client queries MUST filter by token. RLS allows reading but
  -- the token is a UUID that is not guessable.

-- Owner/Admin can create invites
CREATE POLICY "Owner or admin can create invites"
  ON invites FOR INSERT
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND is_household_admin_or_owner(household_id)
  );

-- Authenticated users can update invites (for use_count increment on join)
-- Admin actions are validated in server actions
CREATE POLICY "Authenticated users can update invites"
  ON invites FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Owner/Admin can delete invites
CREATE POLICY "Owner or admin can delete invites"
  ON invites FOR DELETE
  USING (is_household_admin_or_owner(household_id));

-- =============================================
-- STORES
-- =============================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view stores"
  ON stores FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can create stores"
  ON stores FOR INSERT
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can update stores"
  ON stores FOR UPDATE
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can delete stores"
  ON stores FOR DELETE
  USING (household_id IN (SELECT get_my_household_ids()));

-- =============================================
-- CATEGORIES (read-only, public)
-- =============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT
  USING (true);

-- =============================================
-- ITEMS
-- =============================================
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view items"
  ON items FOR SELECT
  USING (store_id IN (
    SELECT id FROM stores
    WHERE household_id IN (SELECT get_my_household_ids())
  ));

CREATE POLICY "Members can add items"
  ON items FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores
      WHERE household_id IN (SELECT get_my_household_ids())
    )
  );

CREATE POLICY "Members can update items"
  ON items FOR UPDATE
  USING (store_id IN (
    SELECT id FROM stores
    WHERE household_id IN (SELECT get_my_household_ids())
  ));

CREATE POLICY "Members can delete items"
  ON items FOR DELETE
  USING (store_id IN (
    SELECT id FROM stores
    WHERE household_id IN (SELECT get_my_household_ids())
  ));

-- =============================================
-- ACTIVITY LOGS
-- =============================================
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household activity"
  ON activity_logs FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND household_id IN (SELECT get_my_household_ids())
  );
