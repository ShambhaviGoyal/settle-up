import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import AddMemberModal from '../components/AddMemberModal';
import ExpenseCard from '../components/ExpenseCard';
import RecurringExpenseModal from '../components/RecurringExpenseModal';
import { expenseAPI, groupAPI } from '../services/api';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../constants/theme';

export default function GroupDetailsScreen() {
  const { groupId, groupName } = useLocalSearchParams();
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [editGroupModalVisible, setEditGroupModalVisible] = useState(false);
  const [groupNameEdit, setGroupNameEdit] = useState('');
  const [groupDescriptionEdit, setGroupDescriptionEdit] = useState('');
  const [isGroupCreator, setIsGroupCreator] = useState(false);

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringExpenses, setRecurringExpenses] = useState<any[]>([]);

  useEffect(() => {
    loadCurrentUser();
    loadGroupData();
    loadRecurringExpenses();
  }, []);
  
  const loadCurrentUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.userId);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadGroupData = async () => {
    setLoading(true);
    try {
      const [groupDetails, groupExpenses, userBalance] = await Promise.all([
        groupAPI.getDetails(Number(groupId)),
        expenseAPI.getGroupExpenses(Number(groupId)),
        expenseAPI.getBalance(Number(groupId)),
      ]);

      setMembers(groupDetails.members);
      setExpenses(groupExpenses);
      setBalance(userBalance);
      
      // Check if current user is the creator
      const userStr = await AsyncStorage.getItem('user');
      const user = JSON.parse(userStr || '{}');
      setIsGroupCreator(groupDetails.group.created_by === user.userId);
      setGroupNameEdit(groupDetails.group.name || '');
      setGroupDescriptionEdit(groupDetails.group.description || '');
    } catch (error: any) {
      console.error('Error loading group data:', error);
      
      // Handle 403 - Not a member
      if (error.response?.status === 403) {
        Alert.alert(
          'Access Denied',
          'You are not a member of this group. You may have been removed or the group may have been deleted.',
          [
            {
              text: 'Go Back',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          error.response?.data?.error || 'Failed to load group data. Please try again.',
          [
            {
              text: 'Retry',
              onPress: loadGroupData,
            },
            {
              text: 'Go Back',
              style: 'cancel',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setEditDescription(expense.description);
    setEditAmount(expense.amount.toString());
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingExpense) return;

    try {
      await expenseAPI.update(
        editingExpense.expense_id,
        parseFloat(editAmount),
        editDescription,
        editingExpense.category || 'other'
      );
      
      setEditModalVisible(false);
      Alert.alert('Success', 'Expense updated successfully');
      loadGroupData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update expense');
    }
  };

  const handleDelete = (expense: any) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseAPI.delete(expense.expense_id);
              Alert.alert('Success', 'Expense deleted successfully');
              loadGroupData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const loadRecurringExpenses = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`http://192.168.29.52:3000/api/recurring/group/${groupId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setRecurringExpenses(data.recurring || []);
    } catch (error) {
      console.error('Error loading recurring:', error);
    }
  };

  const handleUpdateGroup = async () => {
    try {
      await groupAPI.updateGroup(Number(groupId), groupNameEdit, groupDescriptionEdit);
      Alert.alert('Success', 'Group updated successfully');
      setEditGroupModalVisible(false);
      loadGroupData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update group');
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group? You will lose access to all expenses and balances.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupAPI.leaveGroup(Number(groupId));
              Alert.alert('Success', 'Left group successfully');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This will permanently delete all expenses, balances, and settlements. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupAPI.deleteGroup(Number(groupId));
              Alert.alert('Success', 'Group deleted successfully');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete group');
            }
          },
        },
      ]
    );
  };
  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.backText, { color: Colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: Colors.textPrimary }]}>{groupName}</Text>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (isGroupCreator) {
              setEditGroupModalVisible(true);
            }
          }}
          activeOpacity={0.7}
        >
          {isGroupCreator && (
            <Text style={styles.editButtonText}>⚙️</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadGroupData} />
        }
      >
        {/* Balance Summary */}
        {balance && (
          <View style={[styles.balanceCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
            <Text style={[styles.balanceLabel, { color: Colors.textSecondary }]}>Your Balance</Text>
            <Text style={[
              styles.balanceAmount,
              { color: balance.balance > 0 ? '#10b981' : balance.balance < 0 ? '#ef4444' : Colors.textTertiary }
            ]}>
              {balance.balance > 0 ? '+' : ''}{balance.balance < 0 ? '-' : ''}${Math.abs(balance.balance).toFixed(2)}
            </Text>
            <Text style={[styles.balanceDetail, { color: Colors.textSecondary }]}>
              Paid: ${balance.totalPaid.toFixed(2)} • Owe: ${balance.totalOwed.toFixed(2)}
            </Text>
          </View>
        )}

        {/* Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Members ({members.length})</Text>
            <TouchableOpacity 
              style={[styles.addMemberButton, { backgroundColor: Colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAddMemberModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.addMemberButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.membersList}>
            {members.map(member => (
              <View key={member.user_id} style={[styles.memberChip, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
                <View style={[styles.memberAvatar, { backgroundColor: Colors.primary }]}>
                  <Text style={styles.memberAvatarText}>
                    {member.name.split(' ').map((n: string) => n[0]).join('')}
                  </Text>
                </View>
                <Text style={[styles.memberName, { color: Colors.textPrimary }]}>{member.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Expenses */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>
            Expenses ({expenses.length})
          </Text>
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>No expenses yet</Text>
            </View>
          ) : (
            expenses.map(expense => (
            <ExpenseCard
              key={expense.expense_id}
              expenseId={expense.expense_id}
              description={expense.description}
              amount={parseFloat(expense.amount)}
              paidBy={expense.paid_by_name}
              date={new Date(expense.expense_date).toLocaleDateString()}
              category={expense.category}
              splitBetween={members.length}
              isOwner={expense.paid_by === currentUserId}
              onEdit={() => handleEdit(expense)}
              onDelete={() => handleDelete(expense)}
            />
          ))
          )}
        </View>
        {/* Recurring Expenses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Recurring Expenses</Text>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: Colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowRecurringModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          
          {recurringExpenses.length === 0 ? (
            <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>No recurring expenses</Text>
          ) : (
            recurringExpenses.map(recurring => (
              <View key={recurring.recurring_id} style={styles.recurringCard}>
                <View>
                  <Text style={styles.recurringDescription}>{recurring.description}</Text>
                  <Text style={styles.recurringDetails}>
                    ${parseFloat(recurring.amount).toFixed(2)} • Day {recurring.day_of_month} of month
                  </Text>
                </View>
                <View style={styles.recurringActions}>
                  <Text style={[styles.statusBadge, recurring.is_active && styles.statusActive]}>
                    {recurring.is_active ? 'Active' : 'Paused'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Expense</Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={editDescription}
              onChangeText={setEditDescription}
            />

            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </Modal>

      {/* Add Member Modal */}
      <AddMemberModal
        visible={addMemberModalVisible}
        groupId={Number(groupId) || 0}
        onClose={() => setAddMemberModalVisible(false)}
        onMemberAdded={loadGroupData}
      />

      <RecurringExpenseModal
        visible={showRecurringModal}
        groupId={Number(groupId)}
        onClose={() => setShowRecurringModal(false)}
        onCreated={loadRecurringExpenses}
      />

      {/* Edit Group Modal */}
      <Modal
        visible={editGroupModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditGroupModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditGroupModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Group</Text>
            <TouchableOpacity onPress={handleUpdateGroup}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              value={groupNameEdit}
              onChangeText={setGroupNameEdit}
              placeholder="Enter group name"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={groupDescriptionEdit}
              onChangeText={setGroupDescriptionEdit}
              placeholder="Enter group description (optional)"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
      </Modal>

      {/* Group Actions Footer */}
      <View style={styles.footer}>
        {isGroupCreator ? (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteGroup}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteButtonText}>Delete Group</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.leaveButton}
            onPress={handleLeaveGroup}
            activeOpacity={0.8}
          >
            <Text style={styles.leaveButtonText}>Leave Group</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.sm,
  },
  backText: {
    ...Typography.bodyBold,
  },
  title: {
    ...Typography.h3,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  balanceCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  balanceLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  balanceAmount: {
    ...Typography.h1,
    marginBottom: Spacing.xs,
  },
  balanceDetail: {
    ...Typography.caption,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  addMemberButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    ...Shadows.sm,
  },
  addMemberButtonText: {
    ...Typography.captionBold,
    color: '#fff',
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    ...Typography.small,
    color: '#fff',
    fontWeight: '600',
  },
  memberName: {
    ...Typography.caption,
  },
  emptyState: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  cancelText: {
    ...Typography.body,
  },
  modalTitle: {
    ...Typography.h3,
  },
  saveText: {
    ...Typography.bodyBold,
  },
  modalContent: {
    padding: Spacing.lg,
  },
  label: {
    ...Typography.captionBold,
    marginBottom: Spacing.xs,
  },
  input: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  addButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    ...Shadows.sm,
  },
  addButtonText: {
    ...Typography.captionBold,
    color: '#fff',
  },
  recurringCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    ...Shadows.sm,
  },
  recurringDescription: {
    ...Typography.bodyBold,
    marginBottom: Spacing.xs / 2,
  },
  recurringDetails: {
    ...Typography.caption,
  },
  recurringActions: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.full,
    ...Typography.small,
    fontWeight: '600',
  },
  statusActive: {
  },
  emptyTextItalic: {
    ...Typography.caption,
    fontStyle: 'italic',
  },
  editButtonText: {
    fontSize: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  leaveButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  leaveButtonText: {
    ...Typography.bodyBold,
  },
  deleteButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  deleteButtonText: {
    ...Typography.bodyBold,
  },
});