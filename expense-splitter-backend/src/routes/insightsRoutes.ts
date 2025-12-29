import express from 'express';
import { getSpendingInsights } from '../controllers/insightsController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, getSpendingInsights);
router.get('/group/:groupId', authenticateToken, getSpendingInsights);

export default router;