import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PaymentButton from '../../components/PaymentButton';
import { expenseAPI, groupAPI } from '../../services/api';

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
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadBalances} />
      }
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>Balances</Text>
        <TouchableOpacity onPress={() => router.push('/settlements')}>
          <Text style={styles.historyLink}>Payments →</Text>
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
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  groupSelector: {
    marginBottom: 20,
  },
  groupChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  groupChipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  groupChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  groupChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  oweCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  owedCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  balanceCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  balanceInfo: {
    marginBottom: 12,
  },
  personName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  amountOwe: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  amountOwed: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
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
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  remindButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
  },
  paymentSection: {
  gap: 8,
  minWidth: 180,
  },
  markPaidButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  markPaidText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyLink: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '600',
  },
});