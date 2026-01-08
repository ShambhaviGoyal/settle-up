import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { notificationAPI } from '../services/api';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationAPI.getAll();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (notificationId: number) => {
    try {
      await notificationAPI.markRead(notificationId);
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await notificationAPI.markAllRead();
      loadNotifications();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleDelete = async (notificationId: number) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationAPI.delete(notificationId);
              loadNotifications();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete notification');
            }
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'group_invitation':
        return '📬';
      case 'payment_marked':
        return '💵';
      case 'payment_received':
        return '✅';
      case 'invitation_accepted':
        return '🎉';
      case 'expense_added':
        return '💰';
      default:
        return '🔔';
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>
              You're all caught up!
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.notification_id}
              style={[
                styles.notificationCard,
                {
                  backgroundColor: notification.is_read ? Colors.background : Colors.gray50,
                  borderColor: Colors.border,
                },
              ]}
              onPress={() => !notification.is_read && handleMarkRead(notification.notification_id)}
            >
              <View style={styles.notificationContent}>
                <Text style={styles.icon}>{getNotificationIcon(notification.type)}</Text>
                <View style={styles.textContainer}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.message}>{notification.message}</Text>
                  <Text style={styles.time}>
                    {new Date(notification.created_at).toLocaleString()}
                  </Text>
                </View>
                {!notification.is_read && (
                  <View style={styles.unreadDot} />
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(notification.notification_id)}
              >
                <Text style={styles.deleteText}>×</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  emptyState: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  time: {
    ...Typography.small,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
    marginTop: 4,
  },
  deleteButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  deleteText: {
    fontSize: 24,
    fontWeight: '300',
    color: Colors.textTertiary,
  },
});

