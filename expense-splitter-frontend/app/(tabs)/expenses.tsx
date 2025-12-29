import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ReceiptScanner from '../../components/ReceiptScanner';
import { groupAPI } from '../../services/api';
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
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [customAmounts, setCustomAmounts] = useState<{ [key: number]: string }>({});
  const [members, setMembers] = useState<any[]>([]);

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

  const loadMembers = async () => {
    if (!selectedGroup) return;
    
    try {
      const groupDetails = await groupAPI.getDetails(selectedGroup.group_id);
      setMembers(groupDetails.members);
      setSelectedMembers(groupDetails.members.map((m: any) => m.user_id));
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadMembers();
    }
  }, [selectedGroup]);

const handlePhotoTaken = async (uri: string) => {
  setReceiptUri(uri);
  setShowCamera(false);
  
  Alert.alert('Processing Receipt', 'Extracting data from receipt...');
  
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
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

  const toggleMember = (userId: number) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
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

  if (selectedMembers.length === 0) {
    Alert.alert('Error', 'Select at least one person to split with');
    return;
  }

  if (splitType === 'custom') {
    const total = selectedMembers.reduce((sum, id) => {
      return sum + (parseFloat(customAmounts[id] || '0'));
    }, 0);
    
    if (Math.abs(total - amountNum) > 0.01) {
      Alert.alert('Error', `Custom amounts must total $${amountNum.toFixed(2)}`);
      return;
    }
  }

  setLoading(true);
  try {
    let customSplits = null;
    
    if (splitType === 'custom') {
      customSplits = selectedMembers.map(id => ({
        userId: id,
        amount: parseFloat(customAmounts[id] || '0'),
      }));
    }

    const token = await AsyncStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        groupId: selectedGroup.group_id,
        amount: amountNum,
        description,
        category: selectedCategory,
        expenseDate: new Date().toISOString().split('T')[0],
        splitWith: selectedMembers,
        splitType,
        customSplits,
      }),
    });

    if (response.ok) {
      Alert.alert('Success', 'Expense added successfully!');
      setDescription('');
      setAmount('');
      setSelectedCategory('other');
      setReceiptUri(null);
      setSplitType('equal');
      setCustomAmounts({});
      if (selectedGroup) loadMembers();
    } else {
      Alert.alert('Error', 'Failed to add expense');
    }
  } catch (error: any) {
    console.error('Error adding expense:', error);
    Alert.alert('Error', 'Failed to add expense');
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

          {/* ===== ADDED CODE (exact as provided) ===== */}
          <Text style={styles.label}>Split With</Text>
          <View style={styles.splitTypeSelector}>
            <TouchableOpacity
              style={[styles.splitTypeButton, splitType === 'equal' && styles.splitTypeButtonSelected]}
              onPress={() => setSplitType('equal')}
            >
              <Text style={[styles.splitTypeText, splitType === 'equal' && styles.splitTypeTextSelected]}>
                Equal Split
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.splitTypeButton, splitType === 'custom' && styles.splitTypeButtonSelected]}
              onPress={() => setSplitType('custom')}
            >
              <Text style={[styles.splitTypeText, splitType === 'custom' && styles.splitTypeTextSelected]}>
                Custom Amounts
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.membersList}>
            {members.map((member) => (
              <View key={member.user_id} style={styles.memberRow}>
                <TouchableOpacity
                  style={styles.memberCheckbox}
                  onPress={() => toggleMember(member.user_id)}
                >
                  <View style={[styles.checkbox, selectedMembers.includes(member.user_id) && styles.checkboxChecked]}>
                    {selectedMembers.includes(member.user_id) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.memberName}>{member.name}</Text>
                </TouchableOpacity>
                
                {splitType === 'custom' && selectedMembers.includes(member.user_id) && (
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    value={customAmounts[member.user_id] || ''}
                    onChangeText={(text) => setCustomAmounts({ ...customAmounts, [member.user_id]: text })}
                    keyboardType="decimal-pad"
                  />
                )}
              </View>
            ))}
          </View>
          {/* ===== END ADDED CODE ===== */}

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
  splitTypeSelector: {
  flexDirection: 'row',
  gap: 8,
  marginBottom: 16,
  },
  splitTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  splitTypeButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  splitTypeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  splitTypeTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  membersList: {
    marginBottom: 20,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memberCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 6,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 15,
    color: '#374151',
  },
  amountInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 8,
    textAlign: 'right',
  },
});
