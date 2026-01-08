import express from 'express';
import {
  getUserGroups,
  createGroup,
  getGroupDetails,
  addMemberToGroup,
  leaveGroup,
  deleteGroup,
  updateGroup,
} from '../controllers/groupController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', getUserGroups);
router.post('/', createGroup);
router.get('/:groupId', getGroupDetails);
router.put('/:groupId', updateGroup);
router.delete('/:groupId', deleteGroup);
router.post('/:groupId/members', addMemberToGroup);
router.delete('/:groupId/members', leaveGroup);

export default router;