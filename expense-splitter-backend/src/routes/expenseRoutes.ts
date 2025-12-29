import express from 'express';
import {
  getGroupExpenses,
  createExpense,
  getGroupBalance,
  getGroupBalances,
  updateExpense,
  deleteExpense,
} from '../controllers/expenseController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/group/:groupId', getGroupExpenses);
router.post('/', createExpense);
router.put('/:expenseId', updateExpense);
router.delete('/:expenseId', deleteExpense);
router.get('/balance/:groupId', getGroupBalance);
router.get('/balances/:groupId', getGroupBalances);

export default router;