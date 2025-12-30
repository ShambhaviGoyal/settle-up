import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import pool from '../config/database';

// Set budget
export const setBudget = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { groupId, category, amount, period } = req.body;

  try {
    if (!category || !amount) {
      return res.status(400).json({ error: 'Category and amount required' });
    }

    const result = await pool.query(
      `INSERT INTO budgets (user_id, group_id, category, amount, period)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, group_id, category, period)
       DO UPDATE SET amount = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, groupId, category, amount, period || 'monthly']
    );

    res.json({
      message: 'Budget set successfully',
      budget: result.rows[0],
    });
  } catch (error) {
    console.error('Set budget error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get budgets with spending
export const getBudgets = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { groupId } = req.query;

  try {
    // Get budgets
    const budgetsQuery = groupId
      ? 'SELECT * FROM budgets WHERE user_id = $1 AND group_id = $2'
      : 'SELECT * FROM budgets WHERE user_id = $1 AND group_id IS NULL';
    
    const budgets = await pool.query(
      budgetsQuery,
      groupId ? [userId, groupId] : [userId]
    );

    // Calculate spending for each budget
    const budgetsWithSpending = await Promise.all(
      budgets.rows.map(async (budget) => {
        const startDate = new Date();
        startDate.setDate(1); // First day of month
        startDate.setHours(0, 0, 0, 0);

        let spendingQuery = `
          SELECT COALESCE(SUM(es.amount_owed), 0) as spent
          FROM expense_splits es
          JOIN expenses e ON es.expense_id = e.expense_id
          WHERE es.user_id = $1
          AND e.category = $2
          AND e.expense_date >= $3
        `;
        const params: any[] = [userId, budget.category, startDate];

        if (budget.group_id) {
          spendingQuery += ' AND e.group_id = $4';
          params.push(budget.group_id);
        }

        const spendingResult = await pool.query(spendingQuery, params);
        const spent = parseFloat(spendingResult.rows[0].spent);
        const budgetAmount = parseFloat(budget.amount);
        const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

        return {
          ...budget,
          spent,
          remaining: budgetAmount - spent,
          percentage: Math.round(percentage),
          isOverBudget: spent > budgetAmount,
        };
      })
    );

    res.json({ budgets: budgetsWithSpending });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete budget
export const deleteBudget = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { budgetId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM budgets WHERE budget_id = $1 AND user_id = $2 RETURNING *',
      [budgetId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted' });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};