import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_URL = 'http://192.168.29.52:3000/api';

type RecurringExpenseModalProps = {
  visible: boolean;
  groupId: number;
  onClose: () => void;
  onCreated: () => void;
};

const CATEGORIES = [
  { value: 'rent', label: '🏠 Rent' },
  { value: 'utilities', label: '⚡ Utilities' },
  { value: 'food', label: '🍕 Food' },
  { value: 'other', label: '📦 Other' },
];

export default function RecurringExpenseModal({ visible, groupId, onClose, onCreated }: RecurringExpenseModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('rent');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!description || !amount || !dayOfMonth) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const day = parseInt(dayOfMonth);
    if (isNaN(day) || day < 1 || day > 31) {
      Alert.alert('Error', 'Day must be between 1 and 31');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/recurring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupId,
          amount: parseFloat(amount),
          description,
          category,
          frequency: 'monthly',
          dayOfMonth: day,
          startDate: new Date().toISOString().split('T')[0],
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Recurring expense created!');
        setDescription('');
        setAmount('');
        setDayOfMonth('1');
        onCreated();
        onClose();
      } else {
        Alert.alert('Error', 'Failed to create recurring expense');
      }
    } catch (error) {
      console.error('Create recurring error:', error);
      Alert.alert('Error', 'Failed to create recurring expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Recurring Expense</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.description}>
            Set up expenses that repeat monthly (like rent or utilities)
          </Text>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Monthly rent, Netflix subscription"
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categorySelector}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.categoryButton, category === cat.value && styles.categoryButtonSelected]}
                onPress={() => setCategory(cat.value)}
              >
                <Text style={[styles.categoryButtonText, category === cat.value && styles.categoryButtonTextSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Day of Month</Text>
          <TextInput
            style={styles.input}
            placeholder="1-31"
            value={dayOfMonth}
            onChangeText={setDayOfMonth}
            keyboardType="number-pad"
          />
          <Text style={styles.helper}>When should this expense be created each month?</Text>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>{loading ? 'Creating...' : 'Create Recurring Expense'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
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
  cancelText: { color: '#3b82f6', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  content: { padding: 20 },
  description: { fontSize: 15, color: '#6b7280', marginBottom: 24, lineHeight: 22 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#374151' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
  helper: { fontSize: 13, color: '#6b7280', marginTop: -12, marginBottom: 20 },
  categorySelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  categoryButtonSelected: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  categoryButtonText: { fontSize: 13, color: '#6b7280' },
  categoryButtonTextSelected: { color: '#fff', fontWeight: '600' },
  createButton: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  createButtonDisabled: { backgroundColor: '#9ca3af' },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});