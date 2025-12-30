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
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.kicker}>Capture expenses</Text>
            <Text style={styles.title}>Add Expense</Text>
            <Text style={styles.subtitle}>Organize receipts, categories and splits with clarity.</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeEmoji}>✨</Text>
            <Text style={styles.headerBadgeText}>Smarter forms, zero hassle</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.form}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="What was this expense for?"
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
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
                      backgroundColor: category.color + '33',
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
                      placeholderTextColor="#94a3b8"
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
                {receiptUri ? '✓ Receipt scanned' : '📸 Scan receipt'}
              </Text>
              <Text style={styles.scanButtonHint}>Attach a photo and we will auto-fill details.</Text>
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
    backgroundColor: '#0f172a',
    padding: 20,
    paddingTop: 60,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  kicker: {
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.3,
    fontSize: 13,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#e2e8f0',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#cbd5e1',
    marginTop: 6,
    lineHeight: 22,
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0ea5e933',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeEmoji: {
    fontSize: 20,
  },
  headerBadgeText: {
    color: '#e0f2fe',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#0b1224',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
  },
  form: {
    flex: 1,
    padding: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    color: '#e2e8f0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  categorySelector: {
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
    borderColor: '#1f2937',
    backgroundColor: '#0f172a',
  },
  categoryButtonText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '700',
  },
  categoryButtonTextSelected: {
    color: '#0f172a',
    fontWeight: '800',
  },
  noGroupsText: {
    color: '#94a3b8',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  groupSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 30,
  },
  groupButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0f172a',
  },
  groupButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  groupButtonText: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  groupButtonTextSelected: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
  scanButton: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 12,
    alignItems: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  scanButtonText: {
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '700',
  },
  scanButtonHint: {
    marginTop: 4,
    color: '#94a3b8',
    fontSize: 12,
  },
  addButton: {
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
  },
  addButtonDisabled: {
    backgroundColor: '#64748b',
    shadowOpacity: 0,
  },
  addButtonText: {
    color: '#052e16',
    fontSize: 16,
    fontWeight: '800',
  },
  splitTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  splitTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  splitTypeButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  splitTypeText: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '700',
  },
  splitTypeTextSelected: {
    color: '#e2e8f0',
    fontWeight: '800',
  },
  membersList: {
    marginBottom: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 12,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
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
    borderColor: '#1f2937',
    borderRadius: 8,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b1224',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 15,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  amountInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 10,
    padding: 10,
    textAlign: 'right',
    color: '#e2e8f0',
    backgroundColor: '#0b1224',
  },
});
