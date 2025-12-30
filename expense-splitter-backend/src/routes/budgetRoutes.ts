import express from 'express';
import { setBudget, getBudgets, deleteBudget } from '../controllers/budgetController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.post('/', setBudget);
router.get('/', getBudgets);
router.delete('/:budgetId', deleteBudget);

export default router;