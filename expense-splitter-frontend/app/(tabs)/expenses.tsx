import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ReceiptScanner from '../../components/ReceiptScanner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/theme';
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

interface ReceiptItem {
  name: string;
  price: number;
}

interface ParsedReceiptData {
  total?: number;
  subtotal?: number;
  tax?: number;
  tip?: number;
  items?: ReceiptItem[];
  vendor?: string;
  date?: string;
  category?: string;
}

export default function ExpensesScreen() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [groups, setGroups] = useState<any[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'itemized'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [customAmounts, setCustomAmounts] = useState<{ [key: number]: string }>({});
  const [members, setMembers] = useState<any[]>([]);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceiptData | null>(null);
  const [showReceiptData, setShowReceiptData] = useState(false);
  const [subtotal, setSubtotal] = useState('');
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [itemizedSplits, setItemizedSplits] = useState<{ [itemName: string]: number[] }>({});

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
    
    setReceiptBase64(base64);
    
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
      const receiptData = result.data;
      setParsedReceipt(receiptData);
      setDescription(receiptData.vendor || '');
      setAmount(receiptData.total?.toString() || '');
      setSubtotal(receiptData.subtotal?.toString() || '');
      setTax(receiptData.tax?.toString() || '0');
      setTip(receiptData.tip?.toString() || '0');
      setSelectedCategory(receiptData.category || 'other');
      
      if (receiptData.items && receiptData.items.length > 0) {
        setReceiptItems(receiptData.items);
        setSplitType('itemized');
        // Initialize itemized splits - assign all items to all selected members
        const initialSplits: { [key: string]: number[] } = {};
        receiptData.items.forEach((item: ReceiptItem) => {
          initialSplits[item.name] = selectedMembers.length > 0 ? [...selectedMembers] : [];
        });
        setItemizedSplits(initialSplits);
      }
      
      setShowReceiptData(true);
      Alert.alert('Success!', 'Receipt data extracted. Please review and confirm.');
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

  if (splitType === 'itemized') {
    // Validate itemized splits
    let hasItems = false;
    for (const itemName in itemizedSplits) {
      if (itemizedSplits[itemName].length > 0) {
        hasItems = true;
        break;
      }
    }
    if (!hasItems) {
      Alert.alert('Error', 'Please assign at least one item to someone');
      return;
    }
  } else {
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
  }

  setLoading(true);
  try {
    let customSplits = null;
    let items = null;
    let itemizedSplitsData = null;
    
    if (splitType === 'custom') {
      customSplits = selectedMembers.map(id => ({
        userId: id,
        amount: parseFloat(customAmounts[id] || '0'),
      }));
    } else if (splitType === 'itemized') {
      items = receiptItems;
      itemizedSplitsData = itemizedSplits;
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
        receiptImageBase64: receiptBase64,
        subtotal: subtotal ? parseFloat(subtotal) : null,
        tax: tax ? parseFloat(tax) : 0,
        tip: tip ? parseFloat(tip) : 0,
        items,
        itemizedSplits: itemizedSplitsData,
      }),
    });

    if (response.ok) {
      Alert.alert('Success', 'Expense added successfully!');
      setDescription('');
      setAmount('');
      setSubtotal('');
      setTax('');
      setTip('');
      setSelectedCategory('other');
      setReceiptUri(null);
      setReceiptBase64(null);
      setParsedReceipt(null);
      setReceiptItems([]);
      setItemizedSplits({});
      setShowReceiptData(false);
      setSplitType('equal');
      setCustomAmounts({});
      if (selectedGroup) loadMembers();
    } else {
      const errorData = await response.json();
      Alert.alert('Error', errorData.error || 'Failed to add expense');
    }
  } catch (error: any) {
    console.error('Error adding expense:', error);
    Alert.alert('Error', 'Failed to add expense');
  } finally {
    setLoading(false);
  }
};

const toggleItemAssignment = (itemName: string, userId: number) => {
  const currentAssignments = itemizedSplits[itemName] || [];
  if (currentAssignments.includes(userId)) {
    setItemizedSplits({
      ...itemizedSplits,
      [itemName]: currentAssignments.filter(id => id !== userId),
    });
  } else {
    setItemizedSplits({
      ...itemizedSplits,
      [itemName]: [...currentAssignments, userId],
    });
  }
};

  return (
    <>
      <ScrollView 
        style={[styles.container, { backgroundColor: Colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>Add Expense</Text>
          <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Record a new expense</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: Colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
              placeholder="What was this expense for?"
              placeholderTextColor={Colors.textTertiary}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: Colors.textSecondary }]}>Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
              placeholder="0.00"
              placeholderTextColor={Colors.textTertiary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Receipt Data Display */}
          {showReceiptData && parsedReceipt && (
            <View style={[styles.receiptDataContainer, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
              <View style={styles.receiptDataHeader}>
                <Text style={[styles.receiptDataTitle, { color: Colors.textPrimary }]}>📄 Receipt Data</Text>
                <TouchableOpacity onPress={() => setShowReceiptData(!showReceiptData)}>
                  <Text style={[styles.toggleText, { color: Colors.textSecondary }]}>{showReceiptData ? '▼' : '▲'}</Text>
                </TouchableOpacity>
              </View>
              
              {showReceiptData && (
                <>
                  {parsedReceipt.items && parsedReceipt.items.length > 0 && (
                    <View style={styles.itemsContainer}>
                      <Text style={[styles.itemsTitle, { color: Colors.textPrimary }]}>Items:</Text>
                      {parsedReceipt.items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                          <Text style={[styles.itemName, { color: Colors.textPrimary }]}>{item.name}</Text>
                          <Text style={[styles.itemPrice, { color: Colors.textPrimary }]}>${item.price.toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  <View style={styles.receiptBreakdown}>
                    {subtotal && (
                      <View style={styles.breakdownRow}>
                        <Text style={[styles.breakdownLabel, { color: Colors.textSecondary }]}>Subtotal:</Text>
                        <TextInput
                          style={[styles.breakdownInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
                          value={subtotal}
                          onChangeText={setSubtotal}
                          keyboardType="decimal-pad"
                          placeholderTextColor={Colors.textTertiary}
                        />
                      </View>
                    )}
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: Colors.textSecondary }]}>Tax:</Text>
                      <TextInput
                        style={[styles.breakdownInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
                        value={tax}
                        onChangeText={setTax}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: Colors.textSecondary }]}>Tip:</Text>
                      <TextInput
                        style={[styles.breakdownInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
                        value={tip}
                        onChangeText={setTip}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          <Text style={[styles.label, { color: Colors.textSecondary }]}>Category</Text>
          <View style={styles.categorySelector}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={[
                  styles.categoryButton,
                  { borderColor: Colors.border, backgroundColor: selectedCategory === category.value ? category.color : Colors.background },
                  selectedCategory === category.value && {
                    borderColor: category.color,
                  }
                ]}
                onPress={() => setSelectedCategory(category.value)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  { color: selectedCategory === category.value ? '#fff' : Colors.textSecondary }
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: Colors.textSecondary }]}>Group</Text>
          {groups.length === 0 ? (
            <Text style={[styles.noGroupsText, { color: Colors.textSecondary }]}>No groups available. Create a group first!</Text>
          ) : (
            <View style={styles.groupSelector}>
              {groups.map((group) => (
                <TouchableOpacity
                  key={group.group_id}
                  style={[
                    styles.groupButton,
                    { borderColor: Colors.border, backgroundColor: selectedGroup?.group_id === group.group_id ? Colors.primary : Colors.background },
                    selectedGroup?.group_id === group.group_id && { borderColor: Colors.primary }
                  ]}
                  onPress={() => setSelectedGroup(group)}
                >
                  <Text style={[
                    styles.groupButtonText,
                    { color: selectedGroup?.group_id === group.group_id ? '#fff' : Colors.textSecondary }
                  ]}>
                    {group.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: Colors.textSecondary }]}>Split With</Text>
          <View style={styles.splitTypeSelector}>
            <TouchableOpacity
              style={[styles.splitTypeButton, { borderColor: Colors.border, backgroundColor: splitType === 'equal' ? Colors.primary : Colors.background }, splitType === 'equal' && { borderColor: Colors.primary }]}
              onPress={() => setSplitType('equal')}
            >
              <Text style={[styles.splitTypeText, { color: splitType === 'equal' ? '#fff' : Colors.textSecondary }]}>
                Equal Split
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.splitTypeButton, { borderColor: Colors.border, backgroundColor: splitType === 'custom' ? Colors.primary : Colors.background }, splitType === 'custom' && { borderColor: Colors.primary }]}
              onPress={() => setSplitType('custom')}
            >
              <Text style={[styles.splitTypeText, { color: splitType === 'custom' ? '#fff' : Colors.textSecondary }]}>
                Custom Amounts
              </Text>
            </TouchableOpacity>
            {receiptItems.length > 0 && (
              <TouchableOpacity
                style={[styles.splitTypeButton, { borderColor: Colors.border, backgroundColor: splitType === 'itemized' ? Colors.primary : Colors.background }, splitType === 'itemized' && { borderColor: Colors.primary }]}
                onPress={() => setSplitType('itemized')}
              >
                <Text style={[styles.splitTypeText, { color: splitType === 'itemized' ? '#fff' : Colors.textSecondary }]}>
                  Itemized
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {splitType === 'itemized' && receiptItems.length > 0 ? (
            <View style={styles.itemizedContainer}>
              <Text style={[styles.itemizedTitle, { color: Colors.textSecondary }]}>Assign Items to People</Text>
              {receiptItems.map((item, index) => (
                <View key={index} style={[styles.itemizedItemCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
                  <View style={styles.itemizedItemHeader}>
                    <Text style={[styles.itemizedItemName, { color: Colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.itemizedItemPrice, { color: Colors.primary }]}>${item.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.itemizedAssignments}>
                    {members.map((member) => {
                      const isAssigned = itemizedSplits[item.name]?.includes(member.user_id) || false;
                      return (
                        <TouchableOpacity
                          key={member.user_id}
                          style={[styles.assignmentChip, { borderColor: Colors.border, backgroundColor: isAssigned ? Colors.primary : Colors.background }, isAssigned && { borderColor: Colors.primary }]}
                          onPress={() => toggleItemAssignment(item.name, member.user_id)}
                        >
                          <Text style={[styles.assignmentChipText, { color: isAssigned ? '#fff' : Colors.textSecondary }]}>
                            {member.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={[styles.itemizedItemAssigned, { color: Colors.textTertiary }]}>
                    {itemizedSplits[item.name]?.length || 0} {itemizedSplits[item.name]?.length === 1 ? 'person' : 'people'} assigned
                  </Text>
                </View>
              ))}
              <View style={[styles.itemizedSummary, { backgroundColor: Colors.gray50, borderColor: Colors.border }]}>
                <Text style={[styles.itemizedSummaryTitle, { color: Colors.textSecondary }]}>Per-Person Totals:</Text>
                {members.map((member) => {
                  let total = 0;
                  const subtotalNum = subtotal ? parseFloat(subtotal) : receiptItems.reduce((sum, item) => sum + item.price, 0);
                  const taxNum = tax ? parseFloat(tax) : 0;
                  const tipNum = tip ? parseFloat(tip) : 0;
                  
                  // Calculate item total for this person
                  receiptItems.forEach((item) => {
                    if (itemizedSplits[item.name]?.includes(member.user_id)) {
                      const assignedCount = itemizedSplits[item.name].length;
                      total += item.price / assignedCount;
                    }
                  });
                  
                  // Add proportional tax and tip
                  if (subtotalNum > 0 && total > 0) {
                    const proportion = total / subtotalNum;
                    total += (taxNum * proportion) + (tipNum * proportion);
                  }
                  
                  if (total > 0) {
                    return (
                      <View key={member.user_id} style={styles.personTotalRow}>
                        <Text style={[styles.personTotalName, { color: Colors.textPrimary }]}>{member.name}:</Text>
                        <Text style={[styles.personTotalAmount, { color: Colors.primary }]}>${total.toFixed(2)}</Text>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            </View>
          ) : (
            <View style={styles.membersList}>
              {members.map((member) => (
                <View key={member.user_id} style={styles.memberRow}>
                  <TouchableOpacity
                    style={styles.memberCheckbox}
                    onPress={() => toggleMember(member.user_id)}
                  >
                    <View style={[styles.checkbox, { borderColor: Colors.border, backgroundColor: selectedMembers.includes(member.user_id) ? Colors.primary : Colors.background }, selectedMembers.includes(member.user_id) && { borderColor: Colors.primary }]}>
                      {selectedMembers.includes(member.user_id) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.memberName, { color: Colors.textPrimary }]}>{member.name}</Text>
                  </TouchableOpacity>
                  
                  {splitType === 'custom' && selectedMembers.includes(member.user_id) && (
                    <TextInput
                      style={[styles.amountInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
                      placeholder="0.00"
                      placeholderTextColor={Colors.textTertiary}
                      value={customAmounts[member.user_id] || ''}
                      onChangeText={(text) => setCustomAmounts({ ...customAmounts, [member.user_id]: text })}
                      keyboardType="decimal-pad"
                    />
                  )}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={[styles.scanButton, { backgroundColor: Colors.background, borderColor: Colors.border }, receiptUri && { backgroundColor: '#10b981' + '15', borderColor: '#10b981' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCamera(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.scanButtonText, { color: Colors.textSecondary }]}>
              {receiptUri ? '✓ Receipt Scanned' : '📸 Scan Receipt'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: Colors.primary }, loading && styles.addButtonDisabled, groups.length === 0 && styles.addButtonDisabled]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleAddExpense();
            }}
            disabled={loading || groups.length === 0}
            activeOpacity={0.8}
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
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
  },
  form: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.captionBold,
    marginBottom: Spacing.xs,
  },
  input: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  categoryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryButtonText: {
    ...Typography.caption,
  },
  categoryButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  noGroupsText: {
    ...Typography.body,
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
  },
  groupSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  groupButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  groupButtonSelected: {
  },
  groupButtonText: {
    ...Typography.caption,
  },
  groupButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  scanButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  scanButtonActive: {
    borderStyle: 'solid',
  },
  scanButtonText: {
    ...Typography.bodyBold,
  },
  addButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    ...Typography.bodyBold,
    color: '#fff',
  },
  splitTypeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  splitTypeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  splitTypeButtonSelected: {
  },
  splitTypeText: {
    ...Typography.caption,
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
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  memberName: {
    ...Typography.body,
  },
  amountInput: {
    width: 100,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    textAlign: 'right',
    ...Typography.body,
  },
  receiptDataContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  receiptDataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  receiptDataTitle: {
    ...Typography.bodyBold,
  },
  toggleText: {
    ...Typography.body,
    fontSize: 18,
  },
  itemsContainer: {
    marginBottom: Spacing.md,
  },
  itemsTitle: {
    ...Typography.captionBold,
    marginBottom: Spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  itemName: {
    ...Typography.body,
    flex: 1,
  },
  itemPrice: {
    ...Typography.body,
    fontWeight: '600',
  },
  receiptBreakdown: {
    marginTop: Spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  breakdownLabel: {
    ...Typography.body,
    flex: 1,
  },
  breakdownInput: {
    width: 100,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    textAlign: 'right',
    ...Typography.body,
  },
  itemizedContainer: {
    marginBottom: Spacing.md,
  },
  itemizedTitle: {
    ...Typography.captionBold,
    marginBottom: Spacing.md,
  },
  itemizedItemCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  itemizedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  itemizedItemName: {
    ...Typography.bodyBold,
    flex: 1,
  },
  itemizedItemPrice: {
    ...Typography.bodyBold,
  },
  itemizedAssignments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  assignmentChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  assignmentChipSelected: {
  },
  assignmentChipText: {
    ...Typography.caption,
  },
  assignmentChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  itemizedItemAssigned: {
    ...Typography.caption,
    fontSize: 12,
  },
  itemizedSummary: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
  },
  itemizedSummaryTitle: {
    ...Typography.captionBold,
    marginBottom: Spacing.sm,
  },
  personTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  personTotalName: {
    ...Typography.body,
  },
  personTotalAmount: {
    ...Typography.bodyBold,
  },
});
