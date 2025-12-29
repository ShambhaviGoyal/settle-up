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
    // Check if user is member of group
    const memberCheck = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get group details
    const groupResult = await pool.query(
      'SELECT * FROM groups WHERE group_id = $1',
      [groupId]
    );

    // Get members
    const membersResult = await pool.query(
      `SELECT u.user_id, u.name, u.email, u.venmo_handle, u.zelle_handle
       FROM users u
       JOIN group_members gm ON u.user_id = gm.user_id
       WHERE gm.group_id = $1`,
      [groupId]
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
    // Find user by email
    const userResult = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newUserId = userResult.rows[0].user_id;

    // Add to group
    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [groupId, newUserId]
    );

    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};