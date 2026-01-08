import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import PaymentButton from '../../components/PaymentButton';
import { expenseAPI, groupAPI } from '../../services/api';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { useRouter } from 'expo-router';
const router = useRouter();

export default function BalancesScreen() {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingSettlements, setPendingSettlements] = useState<any[]>([]);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadBalances();
      loadMembers();
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const fetchedGroups = await groupAPI.getAll();
      setGroups(fetchedGroups);
      if (fetchedGroups.length > 0) {
        setSelectedGroup(fetchedGroups[0]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadMembers = async () => {
    if (!selectedGroup) return;
    
    try {
      const groupDetails = await groupAPI.getDetails(selectedGroup.group_id);
      setMembers(groupDetails.members);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadBalances = async () => {
    if (!selectedGroup) return;

    setLoading(true);
    try {
      const data = await expenseAPI.getGroupBalances(selectedGroup.group_id);
      setBalances(data);
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMemberDetails = (userId: number) => {
    return members.find(m => m.user_id === userId);
  };

  const handleMarkPaid = async (toUserId: number, amount: number) => {
    Alert.alert(
      'Mark as Paid',
      `Confirm you paid $${amount.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I Paid',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const userStr = await AsyncStorage.getItem('user');
              const currentUser = JSON.parse(userStr || '{}');

              const response = await fetch('http://192.168.29.52:3000/api/expenses/settlement', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  groupId: selectedGroup.group_id,
                  fromUser: currentUser.userId,
                  toUser: toUserId,
                  amount,
                }),
              });

              if (response.ok) {
                Alert.alert('Success', 'Payment marked! Waiting for confirmation.');
                loadBalances();
              }
            } catch (error) {
              console.error('Mark paid error:', error);
              Alert.alert('Error', 'Failed to mark payment');
            }
          },
        },
      ]
    );
  };

  const youOwe = balances.filter(b => parseFloat(b.balance) < 0);
  const owesYou = balances.filter(b => parseFloat(b.balance) > 0);

  const totalYouOwe = youOwe.reduce((sum, b) => sum + Math.abs(parseFloat(b.balance)), 0);
  const totalOwesYou = owesYou.reduce((sum, b) => sum + parseFloat(b.balance), 0);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: Colors.background }]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadBalances} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>Balances</Text>
          <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Track what you owe and are owed</Text>
        </View>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/settlements');
          }}
          style={styles.historyButton}
        >
          <Text style={[styles.historyLink, { color: Colors.primary }]}>Payments →</Text>
        </TouchableOpacity>
      </View>

      {groups.length > 0 && (
        <View style={styles.groupSelector}>
          <Text style={[styles.label, { color: Colors.textSecondary }]}>Select Group:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.group_id}
                style={[
                  styles.groupChip,
                  { borderColor: Colors.border, backgroundColor: selectedGroup?.group_id === group.group_id ? Colors.primary : Colors.background },
                  selectedGroup?.group_id === group.group_id && { borderColor: Colors.primary }
                ]}
                onPress={() => setSelectedGroup(group)}
              >
                <Text style={[
                  styles.groupChipText,
                  { color: selectedGroup?.group_id === group.group_id ? '#fff' : Colors.textSecondary }
                ]}>
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>No groups yet. Create a group to get started!</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
              <Text style={styles.summaryIcon}>💸</Text>
              <Text style={[styles.summaryLabel, { color: Colors.textSecondary }]}>You owe</Text>
              <Text style={[styles.summaryAmount, { color: '#ef4444' }]}>${totalYouOwe.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
              <Text style={styles.summaryIcon}>💰</Text>
              <Text style={[styles.summaryLabel, { color: Colors.textSecondary }]}>You are owed</Text>
              <Text style={[styles.summaryAmount, { color: '#10b981' }]}>${totalOwesYou.toFixed(2)}</Text>
            </View>
          </View>

          {youOwe.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>You Owe</Text>
              {youOwe.map(balance => {
                const member = getMemberDetails(balance.user_id);
                const amount = Math.abs(parseFloat(balance.balance));
                
                return (
                  <View key={balance.user_id} style={[styles.balanceCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
                    <View style={styles.balanceInfo}>
                      <Text style={[styles.personName, { color: Colors.textPrimary }]}>{balance.name}</Text>
                      <Text style={[styles.groupName, { color: Colors.textSecondary }]}>{selectedGroup?.name}</Text>
                      <Text style={[styles.amountOwe, { color: '#ef4444' }]}>
                        ${amount.toFixed(2)}
                      </Text>
                    </View>
                    
                    <View style={styles.paymentSection}>
                      {member?.venmo_handle && (
                        <PaymentButton
                          type="venmo"
                          handle={member.venmo_handle}
                          amount={amount}
                          note={`Payment for ${selectedGroup?.name}`}
                        />
                      )}
                      {member?.zelle_handle && (
                        <PaymentButton
                          type="zelle"
                          handle={member.zelle_handle}
                          amount={amount}
                          note={`Payment for ${selectedGroup?.name}`}
                        />
                      )}
                      
                      <TouchableOpacity 
                        style={[styles.markPaidButton, { backgroundColor: Colors.primary }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          handleMarkPaid(balance.user_id, amount);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.markPaidText}>✓ Mark as Paid</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {owesYou.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Owes You</Text>
              {owesYou.map(balance => (
                <View key={balance.user_id} style={[styles.balanceCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
                  <View style={styles.balanceInfo}>
                    <Text style={[styles.personName, { color: Colors.textPrimary }]}>{balance.name}</Text>
                    <Text style={[styles.groupName, { color: Colors.textSecondary }]}>{selectedGroup?.name}</Text>
                    <Text style={[styles.amountOwed, { color: '#10b981' }]}>
                      ${parseFloat(balance.balance).toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity style={[styles.remindButton, { backgroundColor: Colors.gray50, borderColor: Colors.border }]}>
                    <Text style={[styles.remindButtonText, { color: Colors.textPrimary }]}>Send Reminder</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {balances.length > 0 && youOwe.length === 0 && owesYou.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: Colors.textPrimary }]}>All settled up! 🎉</Text>
            </View>
          )}

          
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
  },
  historyButton: {
    padding: Spacing.xs,
  },
  label: {
    ...Typography.captionBold,
    marginBottom: Spacing.xs,
  },
  groupSelector: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  groupChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  groupChipText: {
    ...Typography.caption,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    ...Shadows.sm,
  },
  summaryIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  summaryAmount: {
    ...Typography.h2,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  balanceCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  balanceInfo: {
    marginBottom: 12,
  },
  personName: {
    ...Typography.h4,
    marginBottom: Spacing.xs / 2,
  },
  groupName: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  amountOwe: {
    ...Typography.h3,
  },
  amountOwed: {
    ...Typography.h3,
  },
  paymentButtons: {
    gap: 8,
  },
  noPaymentInfo: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  remindButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  remindButtonText: {
    ...Typography.captionBold,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    ...Typography.h4,
    textAlign: 'center',
  },
  paymentSection: {
  gap: 8,
  minWidth: 180,
  },
  markPaidButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  markPaidText: {
    ...Typography.captionBold,
    color: '#fff',
  },
  historyLink: {
    ...Typography.bodyBold,
  },
});