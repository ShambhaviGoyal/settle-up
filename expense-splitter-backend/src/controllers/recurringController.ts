import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import pool from '../config/database';

// Create recurring expense
export const createRecurring = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { groupId, amount, description, category, frequency, dayOfMonth, startDate, endDate } = req.body;

  try {
    if (!groupId || !amount || !description || !frequency || !dayOfMonth) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO recurring_expenses 
       (group_id, paid_by, amount, description, category, frequency, day_of_month, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING *`,
      [groupId, userId, amount, description, category || 'other', frequency, dayOfMonth, startDate, endDate]
    );

    res.status(201).json({
      message: 'Recurring expense created',
      recurring: result.rows[0],
    });
  } catch (error) {
    console.error('Create recurring error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all recurring expenses for a group
export const getGroupRecurring = async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;

  try {
    const result = await pool.query(
      `SELECT r.*, u.name as paid_by_name
       FROM recurring_expenses r
       JOIN users u ON r.paid_by = u.user_id
       WHERE r.group_id = $1 AND r.is_active = true
       ORDER BY r.day_of_month`,
      [groupId]
    );

    res.json({ recurring: result.rows });
  } catch (error) {
    console.error('Get recurring error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Pause/Resume recurring expense
export const toggleRecurring = async (req: AuthRequest, res: Response) => {
  const { recurringId } = req.params;
  const userId = req.userId;

  try {
    // Check ownership
    const check = await pool.query(
      'SELECT * FROM recurring_expenses WHERE recurring_id = $1 AND paid_by = $2',
      [recurringId, userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const current = check.rows[0].is_active;
    
    await pool.query(
      'UPDATE recurring_expenses SET is_active = $1 WHERE recurring_id = $2',
      [!current, recurringId]
    );

    res.json({ message: `Recurring expense ${!current ? 'activated' : 'paused'}` });
  } catch (error) {
    console.error('Toggle recurring error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete recurring expense
export const deleteRecurring = async (req: AuthRequest, res: Response) => {
  const { recurringId } = req.params;
  const userId = req.userId;

  try {
    const result = await pool.query(
      'DELETE FROM recurring_expenses WHERE recurring_id = $1 AND paid_by = $2 RETURNING *',
      [recurringId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized or not found' });
    }

    res.json({ message: 'Recurring expense deleted' });
  } catch (error) {
    console.error('Delete recurring error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Process recurring expenses (called by cron)
export const processRecurring = async () => {
  try {
    const today = new Date();
    const dayOfMonth = today.getDate();

    // Find all active recurring expenses due today
    const result = await pool.query(
      `SELECT * FROM recurring_expenses 
       WHERE is_active = true 
       AND day_of_month = $1
       AND (start_date IS NULL OR start_date <= CURRENT_DATE)
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
      [dayOfMonth]
    );

    for (const recurring of result.rows) {
      // Create expense
      const expenseResult = await pool.query(
        `INSERT INTO expenses (group_id, paid_by, amount, description, category, expense_date)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
         RETURNING *`,
        [recurring.group_id, recurring.paid_by, recurring.amount, 
         recurring.description + ' (Auto)', recurring.category]
      );

      const newExpense = expenseResult.rows[0];

      // Get group members
      const members = await pool.query(
        'SELECT user_id FROM group_members WHERE group_id = $1',
        [recurring.group_id]
      );

      // Create splits
      const amountPerPerson = parseFloat(recurring.amount) / members.rows.length;

      for (const member of members.rows) {
        await pool.query(
          `INSERT INTO expense_splits (expense_id, user_id, amount_owed, paid)
           VALUES ($1, $2, $3, $4)`,
          [newExpense.expense_id, member.user_id, amountPerPerson, 
           member.user_id === recurring.paid_by]
        );
      }

      console.log(`✅ Created recurring expense: ${recurring.description}`);
    }

    console.log(`Processed ${result.rows.length} recurring expenses`);
  } catch (error) {
    console.error('Process recurring error:', error);
  }
};