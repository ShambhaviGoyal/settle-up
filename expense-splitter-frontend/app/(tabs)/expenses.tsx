import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ReceiptScanner from '../../components/ReceiptScanner';
import { expenseAPI, groupAPI } from '../../services/api';
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

export default function ExpensesScreen() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [groups, setGroups] = useState<any[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

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

const handlePhotoTaken = async (uri: string) => {
  setReceiptUri(uri);
  setShowCamera(false);
  
  Alert.alert('Processing Receipt', 'Extracting data from receipt...');
  
  try {
    // Compress image first
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }], // Resize to max 1024px width
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    // Convert to base64
    const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Send to backend for OCR
    const response = await fetch(`${API_URL}/ocr/receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({ imageBase64: base64 }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      setDescription(result.data.vendor || '');
      setAmount(result.data.total?.toString() || '');
      setSelectedCategory(result.data.category || 'other');
      
      Alert.alert('Success!', 'Receipt data extracted successfully');
    } else {
      Alert.alert('Error', 'Could not read receipt. Please enter manually.');
    }
  } catch (error) {
    console.error('OCR error:', error);
    Alert.alert('Error', 'Failed to process receipt');
  }
};

  const handleAddExpense = async () => {
    if (!description || !amount || !selectedGroup) {
      Alert.alert('Error', 'Please fill in all fields and select a group');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await expenseAPI.create(
        selectedGroup.group_id,
        amountNum,
        description,
        selectedCategory
      );

      Alert.alert('Success', 'Expense added successfully!');
      
      // Clear form
      setDescription('');
      setAmount('');
      setSelectedCategory('other');
      setReceiptUri(null);
    } catch (error: any) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Add Expense</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="What was this expense for?"
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
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.value && {
                    backgroundColor: category.color,
                    borderColor: category.color,
                  }
                ]}
                onPress={() => setSelectedCategory(category.value)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category.value && styles.categoryButtonTextSelected
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Group</Text>
          {groups.length === 0 ? (
            <Text style={styles.noGroupsText}>No groups available. Create a group first!</Text>
          ) : (
            <View style={styles.groupSelector}>
              {groups.map((group) => (
                <TouchableOpacity
                  key={group.group_id}
                  style={[
                    styles.groupButton,
                    selectedGroup?.group_id === group.group_id && styles.groupButtonSelected
                  ]}
                  onPress={() => setSelectedGroup(group)}
                >
                  <Text style={[
                    styles.groupButtonText,
                    selectedGroup?.group_id === group.group_id && styles.groupButtonTextSelected
                  ]}>
                    {group.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => setShowCamera(true)}
          >
            <Text style={styles.scanButtonText}>
              {receiptUri ? '✓ Receipt Scanned' : '📸 Scan Receipt'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.addButton, loading && styles.addButtonDisabled]}
            onPress={handleAddExpense}
            disabled={loading || groups.length === 0}
          >
            <Text style={styles.addButtonText}>
              {loading ? 'Adding...' : 'Add Expense'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showCamera}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <ReceiptScanner
          onPhotoTaken={handlePhotoTaken}
          onClose={() => setShowCamera(false)}
        />
      </Modal>
    </>
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
    marginBottom: 30,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  noGroupsText: {
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  groupSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 30,
  },
  groupButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  groupButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  groupButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  groupButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  scanButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});