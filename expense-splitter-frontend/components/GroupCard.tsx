import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/theme';

type GroupCardProps = {
  groupId: number;
  groupName: string;
  memberCount: number;
  yourBalance: number;
};

export default function GroupCard({ groupId, groupName, memberCount, yourBalance }: GroupCardProps) {
  const router = useRouter();
  
  const balanceColor = yourBalance > 0 ? Colors.success : yourBalance < 0 ? Colors.error : Colors.gray500;
  const balanceText = yourBalance > 0 
    ? `You are owed $${Math.abs(yourBalance).toFixed(2)}`
    : yourBalance < 0 
    ? `You owe $${Math.abs(yourBalance).toFixed(2)}`
    : 'All settled up';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/group-details',
      params: { groupId, groupName }
    });
  };

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>{groupName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.groupName}>{groupName}</Text>
            <Text style={styles.memberCount}>{memberCount} {memberCount === 1 ? 'member' : 'members'}</Text>
          </View>
        </View>
        <View style={[styles.balanceBadge, { backgroundColor: balanceColor + '15' }]}>
          <Text style={[styles.balance, { color: balanceColor }]}>
            {balanceText}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  iconText: {
    ...Typography.h4,
    color: Colors.textInverse,
  },
  cardInfo: {
    flex: 1,
  },
  groupName: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs / 2,
  },
  memberCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  balanceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  balance: {
    ...Typography.captionBold,
  },
});