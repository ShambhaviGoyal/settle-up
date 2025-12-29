import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CreateGroupModal from '../../components/CreateGroupModal';
import ExpenseCard from '../../components/ExpenseCard';
import GroupCard from '../../components/GroupCard';
import { groupAPI } from '../../services/api';


export default function HomeScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  useEffect(() => {
    loadGroups();
  }, []);

  const recentExpenses = [
    { id: 1, description: 'Grocery shopping', amount: 85.40, paidBy: 'Alice', date: 'Dec 26', splitBetween: 4 },
    { id: 2, description: 'Dinner at Italian place', amount: 120.00, paidBy: 'You', date: 'Dec 25', splitBetween: 3 },
    { id: 3, description: 'Uber to airport', amount: 45.50, paidBy: 'Bob', date: 'Dec 24', splitBetween: 2 },
  ];

  return (
    <>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadGroups} />
        }
      >
        <Text style={styles.title}>Expense Splitter</Text>
        <Text style={styles.subtitle}>Your Groups</Text>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.addButtonText}>+ Create New Group</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
  style={styles.insightsButton}
  onPress={() => router.push('/insights')}
>
  <Text style={styles.insightsButtonText}>💡 AI Insights</Text>
</TouchableOpacity>

        <View style={styles.groupList}>
          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No groups yet. Create one to get started!</Text>
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

        <Text style={styles.subtitle}>Recent Expenses</Text>
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
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    marginTop: 24,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  groupList: {
    marginBottom: 20,
  },
  expenseList: {
    marginBottom: 40,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  insightsButton: {
  backgroundColor: '#eff6ff',
  padding: 12,
  borderRadius: 8,
  alignItems: 'center',
  marginBottom: 20,
  borderWidth: 1,
  borderColor: '#bfdbfe',
},
insightsButtonText: {
  color: '#1e40af',
  fontSize: 15,
  fontWeight: '600',
},
});