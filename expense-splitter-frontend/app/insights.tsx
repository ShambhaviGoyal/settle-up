import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const API_URL = 'http://192.168.29.52:3000/api';

export default function InsightsScreen() {
  const router = useRouter();
  const [insights, setInsights] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/insights`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      setInsights(data.insights);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading insights:', error);
      setInsights('Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AI Insights</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : (
          <>
            {stats && (
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>${stats.totalSpent}</Text>
                  <Text style={styles.statLabel}>Total Spent</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.expenseCount}</Text>
                  <Text style={styles.statLabel}>Expenses</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>${stats.avgPerExpense}</Text>
                  <Text style={styles.statLabel}>Avg/Expense</Text>
                </View>
              </View>
            )}

            <View style={styles.insightsCard}>
              <Text style={styles.insightsTitle}>💡 Your Spending Analysis</Text>
              <Text style={styles.insightsText}>{insights}</Text>
            </View>

            {stats?.categoryBreakdown && (
              <View style={styles.categorySection}>
                <Text style={styles.sectionTitle}>Category Breakdown</Text>
                {Object.entries(stats.categoryBreakdown).map(([category, amount]: any) => (
                  <View key={category} style={styles.categoryRow}>
                    <Text style={styles.categoryName}>{category}</Text>
                    <Text style={styles.categoryAmount}>${amount.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.refreshButton} onPress={loadInsights}>
              <Text style={styles.refreshButtonText}>🔄 Refresh Insights</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  insightsCard: {
    backgroundColor: '#eff6ff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1e40af',
  },
  insightsText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1e3a8a',
  },
  categorySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoryName: {
    fontSize: 15,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});