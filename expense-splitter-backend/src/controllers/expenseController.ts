import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get all expenses for a group
export const getGroupExpenses = async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    // Check if user is member of group
    const memberCheck = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get expenses
    const result = await pool.query(
      `SELECT e.*, u.name as paid_by_name
       FROM expenses e
       JOIN users u ON e.paid_by = u.user_id
       WHERE e.group_id = $1
       ORDER BY e.expense_date DESC, e.created_at DESC`,
      [groupId]
    );

    res.json({ expenses: result.rows });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create new expense
export const createExpense = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { groupId, amount, description, category, expenseDate, splitWith, splitType, customSplits } = req.body;

  try {
    if (!groupId || !amount || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const memberCheck = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const expenseResult = await client.query(
        `INSERT INTO expenses (group_id, paid_by, amount, description, category, expense_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [groupId, userId, amount, description, category || 'other', expenseDate || new Date()]
      );

      const newExpense = expenseResult.rows[0];

      // Handle different split types
      let membersToSplit = splitWith;

      if (!membersToSplit || membersToSplit.length === 0) {
        // Default: equal split among all members
        const membersResult = await client.query(
          'SELECT user_id FROM group_members WHERE group_id = $1',
          [groupId]
        );
        membersToSplit = membersResult.rows.map(row => row.user_id);
      }

      // Create splits based on type
      if (splitType === 'custom' && customSplits) {
        // Custom amounts per person
        for (const split of customSplits) {
          await client.query(
            `INSERT INTO expense_splits (expense_id, user_id, amount_owed, paid)
             VALUES ($1, $2, $3, $4)`,
            [newExpense.expense_id, split.userId, split.amount, split.userId === userId]
          );
        }
      } else if (splitType === 'percentage' && customSplits) {
        // Percentage splits
        for (const split of customSplits) {
          const splitAmount = (parseFloat(amount) * split.percentage) / 100;
          await client.query(
            `INSERT INTO expense_splits (expense_id, user_id, amount_owed, paid)
             VALUES ($1, $2, $3, $4)`,
            [newExpense.expense_id, split.userId, splitAmount, split.userId === userId]
          );
        }
      } else {
        // Equal split (default)
        const amountPerPerson = parseFloat(amount) / membersToSplit.length;

        for (const memberId of membersToSplit) {
          await client.query(
            `INSERT INTO expense_splits (expense_id, user_id, amount_owed, paid)
             VALUES ($1, $2, $3, $4)`,
            [newExpense.expense_id, memberId, amountPerPerson, memberId === userId]
          );
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Expense created successfully',
        expense: newExpense,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get balance for a user in a group
export const getGroupBalance = async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    // Calculate what user paid
    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM expenses
       WHERE group_id = $1 AND paid_by = $2`,
      [groupId, userId]
    );

    const totalPaid = parseFloat(paidResult.rows[0].total_paid);

    // Calculate what user owes
    const owesResult = await pool.query(
      `SELECT COALESCE(SUM(amount_owed), 0) as total_owed
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.expense_id
       WHERE e.group_id = $1 AND es.user_id = $2`,
      [groupId, userId]
    );

    const totalOwed = parseFloat(owesResult.rows[0].total_owed);

    const balance = totalPaid - totalOwed;

    res.json({
      totalPaid,
      totalOwed,
      balance, // positive means they're owed money, negative means they owe
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all balances in a group (who owes whom)
export const getGroupBalances = async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    // Check if user is member
    const memberCheck = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get all members and their balances
    const result = await pool.query(
      `SELECT 
        u.user_id,
        u.name,
        COALESCE(paid.total, 0) as total_paid,
        COALESCE(owed.total, 0) as total_owed,
        COALESCE(paid.total, 0) - COALESCE(owed.total, 0) as balance
       FROM users u
       JOIN group_members gm ON u.user_id = gm.user_id
       LEFT JOIN (
         SELECT paid_by, SUM(amount) as total
         FROM expenses
         WHERE group_id = $1
         GROUP BY paid_by
       ) paid ON u.user_id = paid.paid_by
       LEFT JOIN (
         SELECT es.user_id, SUM(es.amount_owed) as total
         FROM expense_splits es
         JOIN expenses e ON es.expense_id = e.expense_id
         WHERE e.group_id = $1
         GROUP BY es.user_id
       ) owed ON u.user_id = owed.user_id
       WHERE gm.group_id = $1`,
      [groupId]
    );

    res.json({ balances: result.rows });
  } catch (error) {
    console.error('Get group balances error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update expense
export const updateExpense = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { expenseId } = req.params;
  const { amount, description, category } = req.body;

  try {
    // Check if user created this expense
    const expenseCheck = await pool.query(
      'SELECT * FROM expenses WHERE expense_id = $1 AND paid_by = $2',
      [expenseId, userId]
    );

    if (expenseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to edit this expense' });
    }

    const result = await pool.query(
      `UPDATE expenses 
       SET amount = COALESCE($1, amount),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           updated_at = CURRENT_TIMESTAMP
       WHERE expense_id = $4
       RETURNING *`,
      [amount, description, category, expenseId]
    );

    // If amount changed, update splits
    if (amount) {
      const splits = await pool.query(
        'SELECT user_id FROM expense_splits WHERE expense_id = $1',
        [expenseId]
      );

      const amountPerPerson = parseFloat(amount) / splits.rows.length;

      for (const split of splits.rows) {
        await pool.query(
          'UPDATE expense_splits SET amount_owed = $1 WHERE expense_id = $2 AND user_id = $3',
          [amountPerPerson, expenseId, split.user_id]
        );
      }
    }

    res.json({
      message: 'Expense updated successfully',
      expense: result.rows[0],
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete expense
export const deleteExpense = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { expenseId } = req.params;

  try {
    // Check if user created this expense
    const expenseCheck = await pool.query(
      'SELECT * FROM expenses WHERE expense_id = $1 AND paid_by = $2',
      [expenseId, userId]
    );

    if (expenseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this expense' });
    }

    // Delete expense (splits will be deleted automatically due to CASCADE)
    await pool.query('DELETE FROM expenses WHERE expense_id = $1', [expenseId]);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark settlement as paid
export const markSettlementPaid = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { fromUser, toUser, groupId, amount } = req.body;

  try {
    if (userId !== fromUser) {
      return res.status(403).json({ error: 'Can only mark your own payments' });
    }

    const result = await pool.query(
      `INSERT INTO settlements (group_id, from_user, to_user, amount, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [groupId, fromUser, toUser, amount]
    );

    res.status(201).json({
      message: 'Payment marked as pending confirmation',
      settlement: result.rows[0],
    });
  } catch (error) {
    console.error('Mark settlement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Confirm settlement (by recipient)
export const confirmSettlement = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { settlementId } = req.params;

  try {
    const check = await pool.query(
      'SELECT * FROM settlements WHERE settlement_id = $1 AND to_user = $2',
      [settlementId, userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query(
      `UPDATE settlements 
       SET status = 'confirmed', settled_at = CURRENT_TIMESTAMP
       WHERE settlement_id = $1`,
      [settlementId]
    );

    res.json({ message: 'Payment confirmed' });
  } catch (error) {
    console.error('Confirm settlement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get settlement history for a group
export const getGroupSettlements = async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    const memberCheck = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const result = await pool.query(
      `SELECT s.*, 
              u1.name as from_name,
              u2.name as to_name
       FROM settlements s
       JOIN users u1 ON s.from_user = u1.user_id
       JOIN users u2 ON s.to_user = u2.user_id
       WHERE s.group_id = $1
       ORDER BY s.settled_at DESC`,
      [groupId]
    );

    res.json({ settlements: result.rows });
  } catch (error) {
    console.error('Get settlements error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get pending settlements for a user
export const getPendingSettlements = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      `SELECT s.*, 
              u1.name as from_name,
              u2.name as to_name,
              g.name as group_name
       FROM settlements s
       JOIN users u1 ON s.from_user = u1.user_id
       JOIN users u2 ON s.to_user = u2.user_id
       JOIN groups g ON s.group_id = g.group_id
       WHERE (s.from_user = $1 OR s.to_user = $1)
       AND s.status = 'pending'
       ORDER BY s.settled_at DESC`,
      [userId]
    );

    res.json({ settlements: result.rows });
  } catch (error) {
    console.error('Get pending settlements error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Search/filter expenses
export const searchExpenses = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { groupId, search, category, startDate, endDate, minAmount, maxAmount } = req.query;

  try {
    let query = `
      SELECT e.*, u.name as paid_by_name
      FROM expenses e
      JOIN users u ON e.paid_by = u.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Filter by group
    if (groupId) {
      query += ` AND e.group_id = $${paramCount}`;
      params.push(groupId);
      paramCount++;
    } else {
      // User's expenses across all groups
      query += ` AND e.expense_id IN (
        SELECT expense_id FROM expense_splits WHERE user_id = $${paramCount}
      )`;
      params.push(userId);
      paramCount++;
    }

    // Search by description
    if (search) {
      query += ` AND e.description ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Filter by category
    if (category) {
      query += ` AND e.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    // Date range
    if (startDate) {
      query += ` AND e.expense_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }
    if (endDate) {
      query += ` AND e.expense_date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    // Amount range
    if (minAmount) {
      query += ` AND e.amount >= $${paramCount}`;
      params.push(minAmount);
      paramCount++;
    }
    if (maxAmount) {
      query += ` AND e.amount <= $${paramCount}`;
      params.push(maxAmount);
      paramCount++;
    }

    query += ` ORDER BY e.expense_date DESC, e.created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);

    res.json({ 
      expenses: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Search expenses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};