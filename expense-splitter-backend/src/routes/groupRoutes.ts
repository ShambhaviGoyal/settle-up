import express from 'express';
import {
  getUserGroups,
  createGroup,
  getGroupDetails,
  addMemberToGroup,
} from '../controllers/groupController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', getUserGroups);
router.post('/', createGroup);
router.get('/:groupId', getGroupDetails);
router.post('/:groupId/members', addMemberToGroup);

export default router;