import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';

export interface NotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedId?: number;
  relatedType?: string;
}

// Create a notification (internal function)
export const createNotification = async (data: NotificationData) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [data.userId, data.type, data.title, data.message, data.relatedId || null, data.relatedType || null]
    );
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

// Get all notifications for current user
export const getNotifications = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { unreadOnly } = req.query;

  try {
    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (unreadOnly === 'true') {
      query += ' AND is_read = false';
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const result = await pool.query(query, params);

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark notification as read
export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { notificationId } = req.params;

  try {
    const notificationIdNum = parseInt(notificationId, 10);
    if (isNaN(notificationIdNum)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE notification_id = $1 AND user_id = $2
       RETURNING *`,
      [notificationIdNum, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark all notifications as read
export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    await pool.query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get unread notification count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM notifications 
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { notificationId } = req.params;

  try {
    const notificationIdNum = parseInt(notificationId, 10);
    if (isNaN(notificationIdNum)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const result = await pool.query(
      'DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2 RETURNING *',
      [notificationIdNum, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

