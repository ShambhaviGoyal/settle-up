import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createNotification } from './notificationController';

// Send group invitation
export const sendInvitation = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { groupId } = req.params;
  const { email } = req.body;

  try {
    const groupIdNum = parseInt(groupId, 10);
    if (isNaN(groupIdNum)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user is member of group
    const memberCheck = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupIdNum, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found. They must register first.' });
    }

    const inviteeId = userResult.rows[0].user_id;

    // Check if user is already a member
    const existingMember = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupIdNum, inviteeId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    // Check for existing pending invitation
    const existingInvitation = await pool.query(
      `SELECT * FROM group_invitations 
       WHERE group_id = $1 AND invitee_email = $2 AND status = 'pending'`,
      [groupIdNum, email]
    );

    if (existingInvitation.rows.length > 0) {
      return res.status(400).json({ error: 'Invitation already sent' });
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const result = await pool.query(
      `INSERT INTO group_invitations 
       (group_id, inviter_id, invitee_email, invitee_id, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [groupIdNum, userId, email, inviteeId, expiresAt]
    );

    const invitation = result.rows[0];

    // Get group name
    const groupResult = await pool.query(
      'SELECT name FROM groups WHERE group_id = $1',
      [groupIdNum]
    );
    const groupName = groupResult.rows[0]?.name || 'Unknown Group';

    // Create notification for invitee
    await createNotification({
      userId: inviteeId,
      type: 'group_invitation',
      title: 'Group Invitation',
      message: `You've been invited to join "${groupName}"`,
      relatedId: groupIdNum,
      relatedType: 'group',
    });

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: invitation,
    });
  } catch (error) {
    console.error('Send invitation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get pending invitations for current user
export const getPendingInvitations = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    // Get user email
    const userResult = await pool.query(
      'SELECT email FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;

    // Get invitations by email or user_id
    const result = await pool.query(
      `SELECT gi.*, 
              g.name as group_name,
              g.description as group_description,
              u.name as inviter_name
       FROM group_invitations gi
       JOIN groups g ON gi.group_id = g.group_id
       JOIN users u ON gi.inviter_id = u.user_id
       WHERE (gi.invitee_email = $1 OR gi.invitee_id = $2)
       AND gi.status = 'pending'
       AND (gi.expires_at IS NULL OR gi.expires_at > CURRENT_TIMESTAMP)
       ORDER BY gi.created_at DESC`,
      [userEmail, userId]
    );

    res.json({ invitations: result.rows });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Accept invitation
export const acceptInvitation = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { invitationId } = req.params;

  try {
    const invitationIdNum = parseInt(invitationId, 10);
    if (isNaN(invitationIdNum)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }

    // Get user email
    const userResult = await pool.query(
      'SELECT email FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;

    // Get invitation
    const invitationResult = await pool.query(
      `SELECT * FROM group_invitations 
       WHERE invitation_id = $1 
       AND (invitee_email = $2 OR invitee_id = $3)
       AND status = 'pending'`,
      [invitationIdNum, userEmail, userId]
    );

    if (invitationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already processed' });
    }

    const invitation = invitationResult.rows[0];

    // Check if expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await pool.query(
        'UPDATE group_invitations SET status = $1 WHERE invitation_id = $2',
        ['expired', invitationIdNum]
      );
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Add user to group
      await client.query(
        'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [invitation.group_id, userId]
      );

      // Update invitation status
      await client.query(
        `UPDATE group_invitations 
         SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
         WHERE invitation_id = $1`,
        [invitationIdNum]
      );

      // Get group name
      const groupResult = await client.query(
        'SELECT name FROM groups WHERE group_id = $1',
        [invitation.group_id]
      );
      const groupName = groupResult.rows[0]?.name || 'Unknown Group';

      // Notify inviter
      await createNotification({
        userId: invitation.inviter_id,
        type: 'invitation_accepted',
        title: 'Invitation Accepted',
        message: `${userResult.rows[0].email} accepted your invitation to join "${groupName}"`,
        relatedId: invitation.group_id,
        relatedType: 'group',
      });

      await client.query('COMMIT');

      res.json({ message: 'Invitation accepted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Decline invitation
export const declineInvitation = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { invitationId } = req.params;

  try {
    const invitationIdNum = parseInt(invitationId, 10);
    if (isNaN(invitationIdNum)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }

    // Get user email
    const userResult = await pool.query(
      'SELECT email FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;

    // Update invitation status
    const result = await pool.query(
      `UPDATE group_invitations 
       SET status = 'declined', responded_at = CURRENT_TIMESTAMP
       WHERE invitation_id = $1 
       AND (invitee_email = $2 OR invitee_id = $3)
       AND status = 'pending'
       RETURNING *`,
      [invitationIdNum, userEmail, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already processed' });
    }

    res.json({ message: 'Invitation declined' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

