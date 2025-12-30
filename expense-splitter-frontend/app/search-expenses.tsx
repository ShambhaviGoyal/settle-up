import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ExpenseCard from '../components/ExpenseCard';

const API_URL = 'http://192.168.29.52:3000/api';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'food', label: '🍕 Food' },
  { value: 'rent', label: '🏠 Rent' },
  { value: 'utilities', label: '⚡ Utilities' },
  { value: 'transport', label: '🚗 Transport' },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'shopping', label: '🛍️ Shopping' },
  { value: 'other', label: '📦 Other' },
];

export default function SearchExpensesScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      const params = new URLSearchParams();
      
      if (searchText) params.append('search', searchText);
      if (selectedCategory) params.append('category', selectedCategory);
      
      const response = await fetch(`${API_URL}/expenses/search?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error('Search error:', error);
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
        <Text style={styles.title}>Search Expenses</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Search Input */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by description..."
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
        />

        {/* Category Filter */}
        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryChip,
                selectedCategory === cat.value && styles.categoryChipSelected
              ]}
              onPress={() => setSelectedCategory(cat.value)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === cat.value && styles.categoryChipTextSelected
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search Button */}
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>🔍 Search</Text>
        </TouchableOpacity>

        {/* Results */}
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : searched ? (
          <>
            <Text style={styles.resultsCount}>
              {expenses.length} result{expenses.length !== 1 ? 's' : ''}
            </Text>
            {expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No expenses found</Text>
              </View>
            ) : (
              expenses.map(expense => (
                <ExpenseCard
                  key={expense.expense_id}
                  description={expense.description}
                  amount={parseFloat(expense.amount)}
                  paidBy={expense.paid_by_name}
                  date={new Date(expense.expense_date).toLocaleDateString()}
                  category={expense.category}
                  splitBetween={1}
                />
              ))
            )}
          </>
        ) : (
          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>
              💡 Enter a search term or select a category to find expenses
            </Text>
          </View>
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  categoryScroll: {
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6b7280',
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  instructionBox: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  instructionText: {
    fontSize: 15,
    color: '#1e40af',
    lineHeight: 22,
  },
});