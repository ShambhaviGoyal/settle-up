import express from 'express';
import {
  sendInvitation,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from '../controllers/invitationController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', getPendingInvitations);
router.post('/group/:groupId', sendInvitation);
router.post('/:invitationId/accept', acceptInvitation);
router.post('/:invitationId/decline', declineInvitation);

export default router;

