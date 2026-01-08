import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../constants/theme';

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
  food: Colors.category.food,
  rent: Colors.category.rent,
  utilities: Colors.category.utilities,
  transport: Colors.category.transport,
  entertainment: Colors.category.entertainment,
  shopping: Colors.category.shopping,
  other: Colors.category.other,
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
  const categoryColor = CATEGORY_COLORS[category] || Colors.category.other;
  const yourShare = amount / splitBetween;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.description}>{description}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '15' }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {CATEGORY_LABELS[category]}
            </Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>${amount.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Paid by</Text>
          <Text style={styles.detailText}>{paidBy}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Split</Text>
          <Text style={styles.detailText}>{splitBetween} ways</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailText}>{date}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.yourShare}>
          <Text style={styles.yourShareLabel}>Your share</Text>
          <Text style={styles.yourShareAmount}>
            ${yourShare.toFixed(2)}
          </Text>
        </View>
        {isOwner && (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]} 
              onPress={onEdit}
              activeOpacity={0.7}
            >
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]} 
              onPress={onDelete}
              activeOpacity={0.7}
            >
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
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  description: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    ...Typography.small,
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    ...Typography.h3,
    color: Colors.primary,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  detailLabel: {
    ...Typography.small,
    color: Colors.textTertiary,
  },
  detailText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  detailDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yourShare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  yourShareLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  yourShareAmount: {
    ...Typography.bodyBold,
    color: Colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  editButton: {
    backgroundColor: Colors.info + '15',
  },
  deleteButton: {
    backgroundColor: Colors.error + '15',
  },
  editText: {
    ...Typography.captionBold,
    color: Colors.info,
  },
  deleteText: {
    ...Typography.captionBold,
    color: Colors.error,
  },
});