import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AddMemberModal from '../components/AddMemberModal';
import ExpenseCard from '../components/ExpenseCard';
import { expenseAPI, groupAPI } from '../services/api';

export default function GroupDetailsScreen() {
  const { groupId, groupName } = useLocalSearchParams();
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');

  // Add member modal state
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    loadGroupData();
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
    } catch (error) {
      console.error('Error loading group data:', error);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{groupName}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadGroupData} />
        }
      >
        {/* Balance Summary */}
        {balance && (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <Text style={[
              styles.balanceAmount,
              { color: balance.balance > 0 ? '#10b981' : balance.balance < 0 ? '#ef4444' : '#6b7280' }
            ]}>
              {balance.balance > 0 ? '+' : ''}{balance.balance < 0 ? '-' : ''}${Math.abs(balance.balance).toFixed(2)}
            </Text>
            <Text style={styles.balanceDetail}>
              Paid: ${balance.totalPaid.toFixed(2)} • Owe: ${balance.totalOwed.toFixed(2)}
            </Text>
          </View>
        )}

        {/* Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members ({members.length})</Text>
            <TouchableOpacity 
              style={styles.addMemberButton}
              onPress={() => setAddMemberModalVisible(true)}
            >
              <Text style={styles.addMemberButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.membersList}>
            {members.map(member => (
              <View key={member.user_id} style={styles.memberChip}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {member.name.split(' ').map((n: string) => n[0]).join('')}
                  </Text>
                </View>
                <Text style={styles.memberName}>{member.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Expenses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Expenses ({expenses.length})
          </Text>
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No expenses yet</Text>
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
        groupId={Number(groupId)}
        onClose={() => setAddMemberModalVisible(false)}
        onMemberAdded={loadGroupData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#3b82f6',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#f9fafb',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  balanceDetail: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  addMemberButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addMemberButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  memberName: {
    fontSize: 14,
    color: '#374151',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelText: {
    color: '#6b7280',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
});