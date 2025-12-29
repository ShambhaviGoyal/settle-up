import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ExpenseCardProps = {
  expenseId?: number;
  description: string;
  amount: number;
  paidBy: string;
  date: string;
  category?: string;
  splitBetween: number;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

const CATEGORY_COLORS: { [key: string]: string } = {
  food: '#f59e0b',
  rent: '#8b5cf6',
  utilities: '#3b82f6',
  transport: '#10b981',
  entertainment: '#ec4899',
  shopping: '#f43f5e',
  other: '#6b7280',
};

const CATEGORY_LABELS: { [key: string]: string } = {
  food: '🍕 Food',
  rent: '🏠 Rent',
  utilities: '⚡ Utilities',
  transport: '🚗 Transport',
  entertainment: '🎬 Entertainment',
  shopping: '🛍️ Shopping',
  other: '📦 Other',
};

export default function ExpenseCard({ 
  expenseId,
  description, 
  amount, 
  paidBy, 
  date,
  category = 'other',
  splitBetween,
  isOwner = false,
  onEdit,
  onDelete,
}: ExpenseCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.description}>{description}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[category] + '20' }]}>
            <Text style={[styles.categoryText, { color: CATEGORY_COLORS[category] }]}>
              {CATEGORY_LABELS[category]}
            </Text>
          </View>
        </View>
        <Text style={styles.amount}>${amount.toFixed(2)}</Text>
      </View>
      <View style={styles.details}>
        <Text style={styles.detailText}>Paid by {paidBy}</Text>
        <Text style={styles.detailText}>•</Text>
        <Text style={styles.detailText}>Split {splitBetween} ways</Text>
        <Text style={styles.detailText}>•</Text>
        <Text style={styles.detailText}>{date}</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.yourShare}>
          <Text style={styles.yourShareLabel}>Your share:</Text>
          <Text style={styles.yourShareAmount}>
            ${(amount / splitBetween).toFixed(2)}
          </Text>
        </View>
        {isOwner && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  details: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  yourShare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yourShareLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  yourShareAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});