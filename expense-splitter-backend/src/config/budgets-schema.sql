CREATE TABLE budgets (
  budget_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  period VARCHAR(20) DEFAULT 'monthly',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, group_id, category, period)
);

CREATE INDEX idx_budgets_user ON budgets(user_id);
CREATE INDEX idx_budgets_group ON budgets(group_id);