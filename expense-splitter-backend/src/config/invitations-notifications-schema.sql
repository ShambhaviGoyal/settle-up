-- Group invitations table
CREATE TABLE group_invitations (
  invitation_id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
  inviter_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  invitee_email VARCHAR(255) NOT NULL,
  invitee_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, expired
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Create partial unique index for pending invitations only
CREATE UNIQUE INDEX idx_group_invitations_pending_unique 
ON group_invitations(group_id, invitee_email) 
WHERE status = 'pending';

-- Notifications table
CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- group_invitation, payment_received, payment_marked, expense_added, settlement_pending, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_id INTEGER, -- Can reference group_id, expense_id, settlement_id, etc.
  related_type VARCHAR(50), -- group, expense, settlement, etc.
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_group_invitations_invitee ON group_invitations(invitee_email);
CREATE INDEX idx_group_invitations_invitee_id ON group_invitations(invitee_id);
CREATE INDEX idx_group_invitations_group ON group_invitations(group_id);
CREATE INDEX idx_group_invitations_status ON group_invitations(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(type);

