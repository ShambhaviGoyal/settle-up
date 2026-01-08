import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { invitationAPI } from '../services/api';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';

export default function InvitationsScreen() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const data = await invitationAPI.getPending();
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
      Alert.alert('Error', 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await invitationAPI.accept(invitationId);
      Alert.alert('Success', 'Invitation accepted!');
      loadInvitations();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to accept invitation');
    }
  };

  const handleDecline = async (invitationId: number) => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await invitationAPI.decline(invitationId);
              loadInvitations();
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to decline invitation');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Group Invitations</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : invitations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📬</Text>
            <Text style={styles.emptyTitle}>No pending invitations</Text>
            <Text style={styles.emptyText}>
              You'll see group invitations here when someone invites you
            </Text>
          </View>
        ) : (
          invitations.map((invitation) => (
            <View
              key={invitation.invitation_id}
              style={styles.invitationCard}
            >
              <View style={styles.invitationInfo}>
                <Text style={styles.groupName}>{invitation.group_name}</Text>
                {invitation.group_description && (
                  <Text style={styles.groupDescription}>
                    {invitation.group_description}
                  </Text>
                )}
                <Text style={styles.inviterText}>
                  Invited by {invitation.inviter_name}
                </Text>
                {invitation.expires_at && (
                  <Text style={styles.expiresText}>
                    Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                  </Text>
                )}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.acceptButton, { backgroundColor: Colors.success }]}
                  onPress={() => handleAccept(invitation.invitation_id)}
                >
                  <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => handleDecline(invitation.invitation_id)}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  emptyState: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  invitationCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  invitationInfo: {
    marginBottom: Spacing.md,
  },
  groupName: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  groupDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  inviterText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  expiresText: {
    ...Typography.small,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  acceptButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  declineButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.gray100,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  declineButtonText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
});

