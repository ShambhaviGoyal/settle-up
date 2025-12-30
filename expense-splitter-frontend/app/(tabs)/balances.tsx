import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PaymentButton from '../../components/PaymentButton';
import { expenseAPI, groupAPI } from '../../services/api';

import { useRouter } from 'expo-router';

export default function BalancesScreen() {
  const router = useRouter();
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
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadBalances} />
      }
    >
      <View style={styles.heroCard}>
        <View style={styles.heroTextBlock}>
          <Text style={styles.kicker}>Settle smarter</Text>
          <Text style={styles.title}>Balances</Text>
          <Text style={styles.subtitle}>Track who owes whom at a glance, then clear it with a tap.</Text>
        </View>
        <View style={styles.heroChips}>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipLabel}>You owe</Text>
            <Text style={styles.heroChipValue}>${totalYouOwe.toFixed(2)}</Text>
          </View>
          <View style={[styles.heroChip, styles.heroChipPositive]}>
            <Text style={styles.heroChipLabel}>Owed to you</Text>
            <Text style={styles.heroChipValue}>${totalOwesYou.toFixed(2)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.historyButton} onPress={() => router.push('/settlements')}>
          <Text style={styles.historyLink}>View payment history →</Text>
        </TouchableOpacity>
      </View>

      {groups.length > 0 && (
        <View style={styles.groupSelector}>
          <Text style={styles.label}>Select Group:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.group_id}
                style={[
                  styles.groupChip,
                  selectedGroup?.group_id === group.group_id && styles.groupChipSelected
                ]}
                onPress={() => setSelectedGroup(group)}
              >
                <Text style={[
                  styles.groupChipText,
                  selectedGroup?.group_id === group.group_id && styles.groupChipTextSelected
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
          <Text style={styles.emptyText}>No groups yet. Create a group to get started!</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, styles.oweCard]}>
              <Text style={styles.summaryLabel}>You owe</Text>
              <Text style={styles.summaryAmount}>${totalYouOwe.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryCard, styles.owedCard]}>
              <Text style={styles.summaryLabel}>You are owed</Text>
              <Text style={styles.summaryAmount}>${totalOwesYou.toFixed(2)}</Text>
            </View>
          </View>

          {youOwe.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>You Owe</Text>
              {youOwe.map(balance => {
                const member = getMemberDetails(balance.user_id);
                const amount = Math.abs(parseFloat(balance.balance));
                
                return (
                  <View key={balance.user_id} style={styles.balanceCard}>
                    <View style={styles.balanceInfo}>
                      <Text style={styles.personName}>{balance.name}</Text>
                      <Text style={styles.groupName}>{selectedGroup?.name}</Text>
                      <Text style={styles.amountOwe}>
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
                        style={styles.markPaidButton}
                        onPress={() => handleMarkPaid(balance.user_id, amount)}
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
              <Text style={styles.sectionTitle}>Owes You</Text>
              {owesYou.map(balance => (
                <View key={balance.user_id} style={styles.balanceCard}>
                  <View style={styles.balanceInfo}>
                    <Text style={styles.personName}>{balance.name}</Text>
                    <Text style={styles.groupName}>{selectedGroup?.name}</Text>
                    <Text style={styles.amountOwed}>
                      ${parseFloat(balance.balance).toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.remindButton}>
                    <Text style={styles.remindButtonText}>Send Reminder</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {balances.length > 0 && youOwe.length === 0 && owesYou.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>All settled up! 🎉</Text>
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
    backgroundColor: '#0f172a',
    padding: 20,
    paddingTop: 60,
  },
  heroCard: {
    backgroundColor: '#0b1224',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    marginBottom: 18,
  },
  heroTextBlock: {
    gap: 6,
  },
  kicker: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  subtitle: {
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 22,
    marginTop: 4,
  },
  heroChips: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  heroChip: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  heroChipPositive: {
    borderColor: '#22c55e',
  },
  heroChipLabel: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 12,
  },
  heroChipValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e2e8f0',
    marginTop: 6,
  },
  historyButton: {
    marginTop: 12,
  },
  historyLink: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  groupSelector: {
    marginBottom: 20,
  },
  groupChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0f172a',
    marginRight: 8,
  },
  groupChipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  groupChipText: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  groupChipTextSelected: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#0b1224',
    borderColor: '#1f2937',
  },
  oweCard: {
    borderColor: '#f87171',
  },
  owedCard: {
    borderColor: '#34d399',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 6,
    fontWeight: '700',
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    color: '#e2e8f0',
    letterSpacing: 0.2,
  },
  balanceCard: {
    backgroundColor: '#0b1224',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
  },
  balanceInfo: {
    marginBottom: 12,
  },
  personName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: '#e2e8f0',
  },
  groupName: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  amountOwe: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f87171',
  },
  amountOwed: {
    fontSize: 20,
    fontWeight: '800',
    color: '#34d399',
  },
  paymentButtons: {
    gap: 8,
  },
  noPaymentInfo: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  remindButton: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  remindButtonText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#94a3b8',
  },
  paymentSection: {
    gap: 8,
    minWidth: 180,
  },
  markPaidButton: {
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  markPaidText: {
    color: '#052e16',
    fontSize: 14,
    fontWeight: '800',
  },
});
