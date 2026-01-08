import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CreateGroupModal from '../../components/CreateGroupModal';
import ExpenseCard from '../../components/ExpenseCard';
import GroupCard from '../../components/GroupCard';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/theme';
import { groupAPI, invitationAPI, notificationAPI } from '../../services/api';

export default function HomeScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const fetchedGroups = await groupAPI.getAll();
      setGroups(fetchedGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const [invitations, unreadCount] = await Promise.all([
        invitationAPI.getPending(),
        notificationAPI.getUnreadCount(),
      ]);
      setInvitationCount(invitations.length);
      setNotificationCount(unreadCount);
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  useEffect(() => {
    loadGroups();
    loadCounts();
    // Refresh counts every 30 seconds
    const interval = setInterval(loadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const recentExpenses = [
    { id: 1, description: 'Grocery shopping', amount: 85.40, paidBy: 'Alice', date: 'Dec 26', splitBetween: 4 },
    { id: 2, description: 'Dinner at Italian place', amount: 120.00, paidBy: 'You', date: 'Dec 25', splitBetween: 3 },
    { id: 3, description: 'Uber to airport', amount: 45.50, paidBy: 'Bob', date: 'Dec 24', splitBetween: 2 },
  ];

  const handleCreateGroup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCreateModal(true);
  };

  const handleNavigate = (path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(path);
  };

  return (
    <>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => { loadGroups(); loadCounts(); }} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Expense Splitter</Text>
          <Text style={styles.subtitle}>Manage your shared expenses</Text>
          
          {/* Notification and Invitation Badges */}
          <View style={styles.badgeContainer}>
            {(invitationCount > 0 || notificationCount > 0) && (
              <>
                {invitationCount > 0 && (
                  <TouchableOpacity
                    style={[styles.badge, { backgroundColor: Colors.primary }]}
                    onPress={() => router.push('/invitations')}
                  >
                    <Text style={styles.badgeText}>📬 {invitationCount}</Text>
                  </TouchableOpacity>
                )}
                {notificationCount > 0 && (
                  <TouchableOpacity
                    style={[styles.badge, { backgroundColor: '#ec4899' }]}
                    onPress={() => router.push('/notifications')}
                  >
                    <Text style={styles.badgeText}>🔔 {notificationCount}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
        
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleCreateGroup}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>+ Create New Group</Text>
          </TouchableOpacity>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => handleNavigate('/insights')}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>💡</Text>
              <Text style={styles.actionText}>AI Insights</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => handleNavigate('/search-expenses')}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>🔍</Text>
              <Text style={styles.actionText}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => handleNavigate('/budgets')}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>💰</Text>
              <Text style={styles.actionText}>Budgets</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Groups</Text>
          <View style={styles.groupList}>
            {groups.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📁</Text>
                <Text style={styles.emptyTitle}>No groups yet</Text>
                <Text style={styles.emptyText}>Create your first group to start splitting expenses</Text>
              </View>
            ) : (groups.map((group: any) => (
              <GroupCard
                key={group.group_id}
                groupId={group.group_id}
                groupName={group.name}
                memberCount={group.member_count}
                yourBalance={0}
              />
            ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          <View style={styles.expenseList}>
            {recentExpenses.map(expense => (
              <ExpenseCard
                key={expense.id}
                description={expense.description}
                amount={expense.amount}
                paidBy={expense.paidBy}
                date={expense.date}
                splitBetween={expense.splitBetween}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={loadGroups}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  quickActions: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  primaryButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    ...Shadows.sm,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  actionText: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  groupList: {
    gap: Spacing.sm,
  },
  expenseList: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  emptyState: {
    padding: Spacing.xxl,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.background,
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
});
