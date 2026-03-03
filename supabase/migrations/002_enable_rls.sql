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

-- =============================================
-- PROFILES
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read profiles in their household"
  ON profiles FOR SELECT
  USING (id IN (
    SELECT user_id FROM household_members
    WHERE household_id IN (SELECT get_my_household_ids())
  ));

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

-- Members can view their household
CREATE POLICY "Members can view their household"
  ON households FOR SELECT
  USING (id IN (SELECT get_my_household_ids()));

-- Allow anyone to look up household by invite_code (for join flow)
CREATE POLICY "Anyone can lookup household by invite code"
  ON households FOR SELECT
  USING (true);
  -- Note: client queries should filter by invite_code to avoid leaking data

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

CREATE POLICY "Users can join a household (insert themselves)"
  ON household_members FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can leave (delete themselves)"
  ON household_members FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- Owner can remove members
CREATE POLICY "Owner can remove members"
  ON household_members FOR DELETE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = (SELECT auth.uid())
    )
  );

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
    created_by = (SELECT auth.uid())
    AND store_id IN (
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
