import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get all groups for a user
export const getUserGroups = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      `SELECT g.group_id, g.name, g.description, g.created_at,
              COUNT(DISTINCT gm.user_id) as member_count
       FROM groups g
       JOIN group_members gm ON g.group_id = gm.group_id
       WHERE g.group_id IN (
         SELECT group_id FROM group_members WHERE user_id = $1
       )
       GROUP BY g.group_id
       ORDER BY g.created_at DESC`,
      [userId]
    );

    res.json({ groups: result.rows });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create new group
export const createGroup = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { name, description, memberEmails } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create group
      const groupResult = await client.query(
        'INSERT INTO groups (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
        [name, description, userId]
      );

      const newGroup = groupResult.rows[0];

      // Add creator as member
      await client.query(
        'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
        [newGroup.group_id, userId]
      );

      // Add other members if emails provided
      if (memberEmails && memberEmails.length > 0) {
        for (const email of memberEmails) {
          const userResult = await client.query(
            'SELECT user_id FROM users WHERE email = $1',
            [email]
          );

          if (userResult.rows.length > 0) {
            await client.query(
              'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [newGroup.group_id, userResult.rows[0].user_id]
            );
          }
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Group created successfully',
        group: newGroup,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get group details
export const getGroupDetails = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { groupId } = req.params;

  try {
    // Validate and parse groupId
    const groupIdNum = parseInt(groupId, 10);
    if (isNaN(groupIdNum)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // Check if user is member of group
    const memberCheck = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupIdNum, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get group details
    const groupResult = await pool.query(
      'SELECT * FROM groups WHERE group_id = $1',
      [groupIdNum]
    );

    // Get members
    const membersResult = await pool.query(
      `SELECT u.user_id, u.name, u.email, u.venmo_handle, u.zelle_handle
       FROM users u
       JOIN group_members gm ON u.user_id = gm.user_id
       WHERE gm.group_id = $1`,
      [groupIdNum]
    );

    res.json({
      group: groupResult.rows[0],
      members: membersResult.rows,
    });
  } catch (error) {
    console.error('Get group details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add member to group
export const addMemberToGroup = async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const { email } = req.body;

  try {
    // Validate groupId
    const groupIdNum = parseInt(groupId, 10);
    if (isNaN(groupIdNum)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // Validate email
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newUserId = userResult.rows[0].user_id;

    // Check if user is already a member
    const existingMember = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupIdNum, newUserId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    // Add to group
    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [groupIdNum, newUserId]
    );

    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Leave a group
export const leaveGroup = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { groupId } = req.params;

  try {
    // Validate and parse groupId
    const groupIdNum = parseInt(groupId, 10);
    if (isNaN(groupIdNum)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // Check if user is member
    const memberCheck = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupIdNum, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Check if user is the creator
    const groupResult = await pool.query(
      'SELECT created_by FROM groups WHERE group_id = $1',
      [groupIdNum]
    );

    if (groupResult.rows[0]?.created_by === userId) {
      return res.status(400).json({ error: 'Group creator cannot leave. Delete the group instead.' });
    }

    // Remove from group
    await pool.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupIdNum, userId]
    );

    res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete a group (admin only)
export const deleteGroup = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { groupId } = req.params;

  try {
    // Validate and parse groupId
    const groupIdNum = parseInt(groupId, 10);
    if (isNaN(groupIdNum)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // Check if user is the creator
    const groupResult = await pool.query(
      'SELECT created_by FROM groups WHERE group_id = $1',
      [groupIdNum]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (groupResult.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Only group creator can delete the group' });
    }

    // Delete group (cascade will handle related records)
    await pool.query('DELETE FROM groups WHERE group_id = $1', [groupIdNum]);

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update group settings
export const updateGroup = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { groupId } = req.params;
  const { name, description } = req.body;

  try {
    // Validate and parse groupId
    const groupIdNum = parseInt(groupId, 10);
    if (isNaN(groupIdNum)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // Check if user is the creator
    const groupResult = await pool.query(
      'SELECT created_by FROM groups WHERE group_id = $1',
      [groupIdNum]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (groupResult.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Only group creator can update group settings' });
    }

    // Update group
    const updateResult = await pool.query(
      `UPDATE groups 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE group_id = $3
       RETURNING *`,
      [name, description, groupIdNum]
    );

    res.json({
      message: 'Group updated successfully',
      group: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};