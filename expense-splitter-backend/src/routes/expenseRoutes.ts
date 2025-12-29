import express from 'express';
import {
  getGroupExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getGroupBalance,
  getGroupBalances,
  markSettlementPaid,
  confirmSettlement,
  getGroupSettlements,
  getPendingSettlements,
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
router.post('/settlement', markSettlementPaid);
router.patch('/settlement/:settlementId/confirm', confirmSettlement);
router.get('/settlements/:groupId', getGroupSettlements);
router.get('/settlements/pending', getPendingSettlements);

export default router;