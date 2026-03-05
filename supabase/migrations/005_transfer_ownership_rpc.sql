-- =============================================
-- Migration 005: Atomic Ownership Transfer RPC
-- Wraps ownership transfer in a transaction
-- =============================================

CREATE OR REPLACE FUNCTION transfer_ownership(
    p_household_id UUID,
    p_new_owner_id UUID,
    p_caller_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify caller is current owner
    IF NOT EXISTS (
        SELECT 1 FROM household_members
        WHERE household_id = p_household_id
          AND user_id = p_caller_id
          AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Only the current owner can transfer ownership';
    END IF;

    -- Verify new owner is a member
    IF NOT EXISTS (
        SELECT 1 FROM household_members
        WHERE household_id = p_household_id
          AND user_id = p_new_owner_id
    ) THEN
        RAISE EXCEPTION 'New owner must be a member of the household';
    END IF;

    -- All 3 updates in a single transaction (implicit in plpgsql)
    -- 1. Promote new owner
    UPDATE household_members
    SET role = 'owner'
    WHERE household_id = p_household_id
      AND user_id = p_new_owner_id;

    -- 2. Demote old owner to admin
    UPDATE household_members
    SET role = 'admin'
    WHERE household_id = p_household_id
      AND user_id = p_caller_id;

    -- 3. Update household created_by
    UPDATE households
    SET created_by = p_new_owner_id
    WHERE id = p_household_id;
END;
$$;

-- =============================================
-- Atomic invite use_count increment
-- =============================================

CREATE OR REPLACE FUNCTION increment_invite_use_count(p_invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE invites
    SET use_count = use_count + 1
    WHERE id = p_invite_id;
END;
$$;
