-- Users table
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  venmo_handle VARCHAR(50),
  zelle_handle VARCHAR(50),
  paypal_handle VARCHAR(50),
  profile_picture_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE groups (
  group_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group members table
CREATE TABLE group_members (
  group_member_id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

-- Expenses table
CREATE TABLE expenses (
  expense_id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
  paid_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(50) DEFAULT 'other',
  receipt_image_url TEXT,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense splits table (who owes what for each expense)
CREATE TABLE expense_splits (
  split_id SERIAL PRIMARY KEY,
  expense_id INTEGER REFERENCES expenses(expense_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  amount_owed DECIMAL(10, 2) NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP,
  UNIQUE(expense_id, user_id)
);

-- Settlements table (when someone pays back)
CREATE TABLE settlements (
  settlement_id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
  from_user INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  to_user INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  payment_proof_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  settled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recurring expenses table
CREATE TABLE recurring_expenses (
  recurring_id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
  paid_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(50) DEFAULT 'other',
  frequency VARCHAR(20) NOT NULL,
  day_of_month INTEGER,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_expenses_group ON expenses(group_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_settlements_from ON settlements(from_user);
CREATE INDEX idx_settlements_to ON settlements(to_user);