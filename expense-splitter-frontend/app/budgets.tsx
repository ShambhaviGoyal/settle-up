import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_URL = 'http://192.168.29.52:3000/api';

const CATEGORIES = [
  { value: 'food', label: '🍕 Food', color: '#f59e0b' },
  { value: 'rent', label: '🏠 Rent', color: '#8b5cf6' },
  { value: 'utilities', label: '⚡ Utilities', color: '#3b82f6' },
  { value: 'transport', label: '🚗 Transport', color: '#10b981' },
  { value: 'entertainment', label: '🎬 Entertainment', color: '#ec4899' },
  { value: 'shopping', label: '🛍️ Shopping', color: '#f43f5e' },
  { value: 'other', label: '📦 Other', color: '#6b7280' },
];

export default function BudgetsScreen() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('food');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/budgets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      setBudgets(data.budgets || []);
    } catch (error) {
      console.error('Load budgets error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBudget = async () => {
    if (!amount) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: selectedCategory,
          amount: parseFloat(amount),
          period: 'monthly',
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Budget set!');
        setAmount('');
        setShowAddModal(false);
        loadBudgets();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to set budget');
    }
  };

  const getCategoryColor = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.color || '#6b7280';
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Monthly Budgets</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No budgets set yet</Text>
            <Text style={styles.emptySubtext}>Tap + to create your first budget</Text>
          </View>
        ) : (
          budgets.map(budget => {
            const color = getCategoryColor(budget.category);
            
            return (
              <View key={budget.budget_id} style={styles.budgetCard}>
                <View style={styles.budgetHeader}>
                  <Text style={styles.budgetCategory}>{getCategoryLabel(budget.category)}</Text>
                  <Text style={styles.budgetAmount}>${parseFloat(budget.amount).toFixed(2)}</Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${Math.min(budget.percentage, 100)}%`,
                        backgroundColor: budget.isOverBudget ? '#ef4444' : color
                      }
                    ]} 
                  />
                </View>

                <View style={styles.budgetStats}>
                  <Text style={styles.budgetSpent}>
                    Spent: ${budget.spent.toFixed(2)} ({budget.percentage}%)
                  </Text>
                  <Text style={[
                    styles.budgetRemaining,
                    budget.isOverBudget && styles.budgetOver
                  ]}>
                    {budget.isOverBudget 
                      ? `$${Math.abs(budget.remaining).toFixed(2)} over`
                      : `$${budget.remaining.toFixed(2)} left`}
                  </Text>
                </View>

                {budget.isOverBudget && (
                  <View style={styles.warningBadge}>
                    <Text style={styles.warningText}>⚠️ Over budget!</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Budget Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Set Budget</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryButton,
                    selectedCategory === cat.value && { backgroundColor: cat.color, borderColor: cat.color }
                  ]}
                  onPress={() => setSelectedCategory(cat.value)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory === cat.value && styles.categoryButtonTextSelected
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Monthly Budget</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleAddBudget}>
              <Text style={styles.saveButtonText}>Set Budget</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  budgetCard: {
    backgroundColor: '#f9fafb',
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetCategory: {
    fontSize: 16,
    fontWeight: '600',
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetSpent: {
    fontSize: 14,
    color: '#6b7280',
  },
  budgetRemaining: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  budgetOver: {
    color: '#ef4444',
  },
  warningBadge: {
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelText: { color: '#6b7280', fontSize: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalContent: { padding: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#374151' },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  categoryButtonText: {
    fontSize: 13,
    color: '#6b7280',
  },
  categoryButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});