-- =============================================
-- CartBuddy Seed Data
-- Migration 004: Seed Categories
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
