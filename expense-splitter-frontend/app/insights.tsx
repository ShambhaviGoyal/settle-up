import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../constants/theme';

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
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: Colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: Colors.textPrimary }]}>AI Insights</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {stats && (
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
                  <Text style={[styles.statValue, { color: Colors.primary }]}>${stats.totalSpent}</Text>
                  <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Total Spent</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
                  <Text style={[styles.statValue, { color: Colors.primary }]}>{stats.expenseCount}</Text>
                  <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Expenses</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
                  <Text style={[styles.statValue, { color: Colors.primary }]}>${stats.avgPerExpense}</Text>
                  <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Avg/Expense</Text>
                </View>
              </View>
            )}

            <View style={[styles.insightsCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
              <Text style={[styles.insightsTitle, { color: Colors.textPrimary }]}>💡 Your Spending Analysis</Text>
              <Text style={[styles.insightsText, { color: Colors.textSecondary }]}>{insights}</Text>
            </View>

            {stats?.categoryBreakdown && (
              <View style={styles.categorySection}>
                <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Category Breakdown</Text>
                {Object.entries(stats.categoryBreakdown).map(([category, amount]: any) => (
                  <View key={category} style={[styles.categoryRow, { borderBottomColor: Colors.border }]}>
                    <Text style={[styles.categoryName, { color: Colors.textSecondary }]}>{category}</Text>
                    <Text style={[styles.categoryAmount, { color: Colors.textPrimary }]}>${amount.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={[styles.refreshButton, { backgroundColor: Colors.primary }]} onPress={loadInsights}>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backText: {
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
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  insightsCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  insightsText: {
    fontSize: 15,
    lineHeight: 24,
  },
  categorySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryName: {
    fontSize: 15,
    textTransform: 'capitalize',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  refreshButton: {
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