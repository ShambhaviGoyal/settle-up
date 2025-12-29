import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import pool from '../config/database';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const getSpendingInsights = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { groupId } = req.params;

  try {
    // Get user's expenses
    const expensesQuery = groupId 
      ? `SELECT e.*, u.name as paid_by_name 
         FROM expenses e 
         JOIN users u ON e.paid_by = u.user_id
         WHERE e.group_id = $1 
         ORDER BY e.expense_date DESC LIMIT 50`
      : `SELECT e.*, u.name as paid_by_name
         FROM expenses e
         JOIN users u ON e.paid_by = u.user_id
         JOIN expense_splits es ON e.expense_id = es.expense_id
         WHERE es.user_id = $1
         ORDER BY e.expense_date DESC LIMIT 50`;
    
    const params: any[] = groupId ? [groupId] : [userId];
    const expenses = await pool.query(expensesQuery, params);

    if (expenses.rows.length === 0) {
      return res.json({ insights: 'Not enough data yet. Add more expenses to get insights!' });
    }

    // Prepare data for AI
    const expenseData = expenses.rows.map((e: any) => ({
      description: e.description,
      amount: parseFloat(e.amount),
      category: e.category,
      date: e.expense_date,
      paidBy: e.paid_by_name,
    }));

    const totalSpent = expenseData.reduce((sum, e) => sum + e.amount, 0);
    const categoryBreakdown = expenseData.reduce((acc: any, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    // Get AI insights
    const prompt = `Analyze this spending data and provide insights:

Total Spent: $${totalSpent.toFixed(2)}
Number of Expenses: ${expenseData.length}
Category Breakdown: ${JSON.stringify(categoryBreakdown)}
Recent Expenses: ${JSON.stringify(expenseData.slice(0, 10))}

Provide:
1. Top spending category and percentage
2. Unusual spending patterns
3. Money-saving suggestions (2-3 specific tips)
4. Budget recommendations
5. Positive observations

Keep it friendly, concise, and actionable. Use emojis. Max 200 words.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
    });

    const insights = response.choices[0].message.content;

    res.json({ 
      insights,
      stats: {
        totalSpent: totalSpent.toFixed(2),
        expenseCount: expenseData.length,
        categoryBreakdown,
        avgPerExpense: (totalSpent / expenseData.length).toFixed(2),
      }
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
};