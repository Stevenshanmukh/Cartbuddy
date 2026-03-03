-- =============================================
-- CartBuddy Indexes
-- Migration 003: Create Performance Indexes
-- =============================================

-- Household members lookups (RLS helper + queries)
CREATE INDEX idx_household_members_user_id ON household_members(user_id);
CREATE INDEX idx_household_members_household_id ON household_members(household_id);

-- Stores by household
CREATE INDEX idx_stores_household_id ON stores(household_id);

-- Items by store (primary query pattern)
CREATE INDEX idx_items_store_id ON items(store_id);

-- Items filtered by status (active vs checked vs archived)
CREATE INDEX idx_items_status ON items(status);

-- Items by creator (for "Added by" attribution)
CREATE INDEX idx_items_created_by ON items(created_by);

-- Activity logs by household + time (feed query)
CREATE INDEX idx_activity_logs_household_id ON activity_logs(household_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Invite code lookups (join flow)
CREATE INDEX idx_households_invite_code ON households(invite_code);
