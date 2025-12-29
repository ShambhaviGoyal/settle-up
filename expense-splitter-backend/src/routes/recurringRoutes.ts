import express from 'express';
import {
  createRecurring,
  getGroupRecurring,
  toggleRecurring,
  deleteRecurring,
} from '../controllers/recurringController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.post('/', createRecurring);
router.get('/group/:groupId', getGroupRecurring);
router.patch('/:recurringId/toggle', toggleRecurring);
router.delete('/:recurringId', deleteRecurring);

export default router;