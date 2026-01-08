-- Migration for Phase 2: Receipt Scanning features
-- Run this SQL script on your existing database

-- Add new columns to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS receipt_image_base64 TEXT,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS tax DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tip DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_itemized BOOLEAN DEFAULT FALSE;

-- Create receipt_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS receipt_items (
  item_id SERIAL PRIMARY KEY,
  expense_id INTEGER REFERENCES expenses(expense_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  item_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create itemized_splits table if it doesn't exist
CREATE TABLE IF NOT EXISTS itemized_splits (
  itemized_split_id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES receipt_items(item_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_receipt_items_expense ON receipt_items(expense_id);
CREATE INDEX IF NOT EXISTS idx_itemized_splits_item ON itemized_splits(item_id);
CREATE INDEX IF NOT EXISTS idx_itemized_splits_user ON itemized_splits(user_id);

