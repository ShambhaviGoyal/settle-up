import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type GroupCardProps = {
  groupId: number;
  groupName: string;
  memberCount: number;
  yourBalance: number;
};

export default function GroupCard({ groupId, groupName, memberCount, yourBalance }: GroupCardProps) {
  const router = useRouter();
  
  const balanceColor = yourBalance > 0 ? '#10b981' : yourBalance < 0 ? '#ef4444' : '#6b7280';
  const balanceText = yourBalance > 0 
    ? `You are owed $${Math.abs(yourBalance)}`
    : yourBalance < 0 
    ? `You owe $${Math.abs(yourBalance)}`
    : 'All settled up';
  const initials = groupName.slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push({
        pathname: '/group-details',
        params: { groupId, groupName }
      })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.memberCount}>{memberCount} member{memberCount === 1 ? '' : 's'}</Text>
        </View>
        <View style={[styles.balancePill, { backgroundColor: balanceColor + '20' }]}>
          <Text style={[styles.balancePillText, { color: balanceColor }]}>
            {yourBalance === 0 ? 'Clear' : `${yourBalance > 0 ? '+' : '-'}$${Math.abs(yourBalance)}`}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={[styles.balance, { color: balanceColor }]}>
          {balanceText}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0b1224',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  memberCount: {
    fontSize: 14,
    color: '#94a3b8',
  },
  balance: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 16,
  },
  headerContent: {
    flex: 1,
  },
  balancePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#111827',
  },
  balancePillText: {
    fontWeight: '700',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chevron: {
    color: '#475569',
    fontSize: 26,
    fontWeight: '300',
  },
});
