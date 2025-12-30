import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

  const totalMembers = useMemo(
    () => groups.reduce((count: number, group: any) => count + (group.member_count || 0), 0),
    [groups]
  );

  return (
    <>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadGroups} />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.kicker}>Welcome back</Text>
            <Text style={styles.title}>Expense Splitter</Text>
            <Text style={styles.subtitle}>Keep every shared cost transparent and effortless.</Text>
            <View style={styles.heroStats}>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>{groups.length}</Text>
                <Text style={styles.statLabel}>Active groups</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>{totalMembers}</Text>
                <Text style={styles.statLabel}>Friends connected</Text>
              </View>
            </View>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.primaryButtonText}>+ Create group</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => router.push('/budgets')}
            >
              <Text style={styles.secondaryButtonText}>💰 Budgets</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionChip}
            onPress={() => router.push('/insights')}
          >
            <Text style={styles.actionEmoji}>💡</Text>
            <View>
              <Text style={styles.actionTitle}>AI Insights</Text>
              <Text style={styles.actionSubtitle}>Smart tips from your history</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionChip}
            onPress={() => router.push('/search-expenses')}
          >
            <Text style={styles.actionEmoji}>🔍</Text>
            <View>
              <Text style={styles.actionTitle}>Search</Text>
              <Text style={styles.actionSubtitle}>Find any bill instantly</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your groups</Text>
          <TouchableOpacity onPress={loadGroups} disabled={loading}>
            <Text style={styles.sectionLink}>{loading ? 'Refreshing...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent expenses</Text>
          <Text style={styles.sectionLink}>Tracked automatically</Text>
        </View>
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
    backgroundColor: '#0f172a',
    padding: 20,
    paddingTop: 60,
  },
  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
  },
  heroLeft: {
    gap: 6,
  },
  kicker: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  subtitle: {
    fontSize: 15,
    color: '#cbd5e1',
    marginBottom: 12,
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  statBadge: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#0ea5e9',
    borderWidth: 1,
    borderColor: '#38bdf8',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: 12,
    color: '#e0f2fe',
    fontWeight: '600',
  },
  heroActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
  },
  primaryButtonText: {
    color: '#e5edff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
  },
  actionEmoji: {
    fontSize: 26,
  },
  actionTitle: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e2e8f0',
    letterSpacing: 0.2,
  },
  sectionLink: {
    color: '#60a5fa',
    fontWeight: '600',
    fontSize: 13,
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
    backgroundColor: '#0b1224',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
