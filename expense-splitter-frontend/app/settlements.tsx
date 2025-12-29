import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pending Payments</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : settlements.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No pending payments</Text>
          </View>
        ) : (
          settlements.map(settlement => {
            const isRecipient = settlement.to_user === currentUserId;
            
            return (
              <View key={settlement.settlement_id} style={styles.settlementCard}>
                <View style={styles.settlementInfo}>
                  <Text style={styles.settlementAmount}>${parseFloat(settlement.amount).toFixed(2)}</Text>
                  <Text style={styles.settlementDescription}>
                    {isRecipient 
                      ? `${settlement.from_name} paid you`
                      : `You paid ${settlement.to_name}`}
                  </Text>
                  <Text style={styles.settlementGroup}>{settlement.group_name}</Text>
                </View>
                
                {isRecipient && (
                  <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={() => handleConfirm(settlement.settlement_id)}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                )}
                
                {!isRecipient && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backText: { color: '#3b82f6', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  settlementCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settlementInfo: { flex: 1 },
  settlementAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  settlementDescription: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 2,
  },
  settlementGroup: {
    fontSize: 13,
    color: '#6b7280',
  },
  confirmButton: {
    backgroundColor: '#10b981',
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
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});