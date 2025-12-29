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

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push({
        pathname: '/group-details',
        params: { groupId, groupName }
      })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.groupName}>{groupName}</Text>
        <Text style={styles.memberCount}>{memberCount} members</Text>
      </View>
      <Text style={[styles.balance, { color: balanceColor }]}>
        {balanceText}
      </Text>
    </TouchableOpacity>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
  },
  memberCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  balance: {
    fontSize: 16,
    fontWeight: '500',
  },
});