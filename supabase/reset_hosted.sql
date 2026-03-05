-- =============================================
-- CartBuddy: CLEAN SLATE RESET
-- Run this in Supabase SQL Editor to wipe all
-- existing data and apply the new multi-tenant schema
-- =============================================

-- 1. Drop all existing tables (CASCADE handles FKs)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS invites CASCADE;
DROP TABLE IF EXISTS household_members CASCADE;
DROP TABLE IF EXISTS households CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Drop functions
DROP FUNCTION IF EXISTS get_my_household_ids() CASCADE;
DROP FUNCTION IF EXISTS is_household_admin_or_owner(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- 3. Delete all auth users (clean slate)
DELETE FROM auth.users;

-- =============================================
-- CREATE TABLES (from 001_create_tables.sql)
-- =============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Household',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, user_id)
);

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  max_uses INT DEFAULT NULL,
  use_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  notes TEXT,
  category_id INT REFERENCES categories(id),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'checked', 'archived')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL
    CHECK (action IN (
      'item_added', 'item_checked', 'item_unchecked',
      'item_deleted', 'item_edited', 'items_archived',
      'store_created', 'store_deleted',
      'member_joined', 'member_left',
      'shopping_started', 'shopping_ended'
    )),
  item_name TEXT,
  store_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- RLS POLICIES (from 002_enable_rls.sql)
-- =============================================

-- Helper functions
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT household_id FROM household_members
  WHERE user_id = auth.uid()
$$;

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

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read profiles in their household"
  ON profiles FOR SELECT
  USING (id IN (
    SELECT user_id FROM household_members
    WHERE household_id IN (SELECT get_my_household_ids())
  ));

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = (SELECT auth.uid()));

-- HOUSEHOLDS
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their household"
  ON households FOR SELECT
  USING (id IN (SELECT get_my_household_ids()));

CREATE POLICY "Authenticated users can create households"
  ON households FOR INSERT
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Owner can update household"
  ON households FOR UPDATE
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Owner can delete household"
  ON households FOR DELETE
  USING (created_by = (SELECT auth.uid()));

-- HOUSEHOLD MEMBERS
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

CREATE POLICY "Owner or admin can remove members"
  ON household_members FOR DELETE
  USING (is_household_admin_or_owner(household_id));

CREATE POLICY "Owner can update member roles"
  ON household_members FOR UPDATE
  USING (
    household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = (SELECT auth.uid()) AND hm.role = 'owner'
    )
  );

-- INVITES
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invites for their households"
  ON invites FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Anyone can lookup invite by token"
  ON invites FOR SELECT
  USING (true);

CREATE POLICY "Owner or admin can create invites"
  ON invites FOR INSERT
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND is_household_admin_or_owner(household_id)
  );

CREATE POLICY "Owner or admin can update invites"
  ON invites FOR UPDATE
  USING (is_household_admin_or_owner(household_id));

CREATE POLICY "Owner or admin can delete invites"
  ON invites FOR DELETE
  USING (is_household_admin_or_owner(household_id));

-- STORES
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

-- CATEGORIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT
  USING (true);

-- ITEMS
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

-- ACTIVITY LOGS
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

-- =============================================
-- INDEXES (from 003_create_indexes.sql)
-- =============================================

CREATE INDEX idx_household_members_user_id ON household_members(user_id);
CREATE INDEX idx_household_members_household_id ON household_members(household_id);
CREATE INDEX idx_stores_household_id ON stores(household_id);
CREATE INDEX idx_items_store_id ON items(store_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_created_by ON items(created_by);
CREATE INDEX idx_activity_logs_household_id ON activity_logs(household_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_household_id ON invites(household_id);

-- =============================================
-- SEED DATA (from 004_seed_categories.sql)
-- =============================================

INSERT INTO categories (name, sort_order) VALUES
  ('Produce', 1),
  ('Dairy & Eggs', 2),
  ('Meat & Seafood', 3),
  ('Bakery', 4),
  ('Frozen', 5),
  ('Canned & Jarred', 6),
  ('Snacks', 7),
  ('Beverages', 8),
  ('Household', 9),
  ('Personal Care', 10),
  ('Other', 99)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- ENABLE REALTIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE stores;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE household_members;
