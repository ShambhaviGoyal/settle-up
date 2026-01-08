import express from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  deleteNotification,
} from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:notificationId/read', markNotificationRead);
router.patch('/read-all', markAllNotificationsRead);
router.delete('/:notificationId', deleteNotification);

export default router;

