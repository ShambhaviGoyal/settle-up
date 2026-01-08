import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../constants/theme';

const API_URL = 'http://192.168.29.52:3000/api';

export default function SettlementsScreen() {
  const router = useRouter();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('user');
      const user = JSON.parse(userStr || '{}');
      setCurrentUserId(user.userId);

      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/expenses/settlements/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      setSettlements(data.settlements || []);
    } catch (error) {
      console.error('Error loading settlements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (settlementId: number) => {
    Alert.alert(
      'Confirm Payment',
      'Did you receive this payment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Received',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const response = await fetch(`${API_URL}/expenses/settlement/${settlementId}/confirm`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
              });

              if (response.ok) {
                Alert.alert('Success', 'Payment confirmed!');
                loadData();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to confirm payment');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: Colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: Colors.textPrimary }]}>Pending Payments</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : settlements.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>No pending payments</Text>
          </View>
        ) : (
          settlements.map(settlement => {
            const isRecipient = settlement.to_user === currentUserId;
            
            return (
              <View key={settlement.settlement_id} style={[styles.settlementCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
                <View style={styles.settlementInfo}>
                  <Text style={[styles.settlementAmount, { color: '#10b981' }]}>${parseFloat(settlement.amount).toFixed(2)}</Text>
                  <Text style={[styles.settlementDescription, { color: Colors.textPrimary }]}>
                    {isRecipient 
                      ? `${settlement.from_name} paid you`
                      : `You paid ${settlement.to_name}`}
                  </Text>
                  <Text style={[styles.settlementGroup, { color: Colors.textSecondary }]}>{settlement.group_name}</Text>
                </View>
                
                {isRecipient && (
                  <TouchableOpacity 
                    style={[styles.confirmButton, { backgroundColor: '#10b981' }]}
                    onPress={() => handleConfirm(settlement.settlement_id)}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                )}
                
                {!isRecipient && (
                  <View style={[styles.pendingBadge, { backgroundColor: '#fef3c7' }]}>
                    <Text style={[styles.pendingText, { color: '#92400e' }]}>Pending</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backText: { fontSize: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  settlementCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  settlementInfo: { flex: 1 },
  settlementAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  settlementDescription: {
    fontSize: 15,
    marginBottom: 2,
  },
  settlementGroup: {
    fontSize: 13,
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});