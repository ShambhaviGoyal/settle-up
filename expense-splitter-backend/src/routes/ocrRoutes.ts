import express from 'express';
import { processReceipt } from '../controllers/ocrController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/receipt', authenticateToken, processReceipt);

export default router;