-- =============================================
-- CartBuddy Database Schema
-- Migration 001: Create Tables (Multi-Tenant)
-- =============================================

-- Custom profiles table for display names
-- Uses Supabase auth.users for authentication
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Households (tenants)
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Household',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Household members (join table — many-to-many)
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, user_id)
);

-- Invites for joining households
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  max_uses INT DEFAULT NULL,       -- NULL = unlimited
  use_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stores belong to households
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Item categories (seeded separately)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

-- Items belong to stores
-- created_by references profiles for PostgREST join inference
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

-- Activity logs for the activity feed
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

-- Auto-update updated_at on items
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
