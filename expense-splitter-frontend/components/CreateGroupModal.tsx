import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { groupAPI } from '../services/api';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../constants/theme';

type CreateGroupModalProps = {
  visible: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
};

export default function CreateGroupModal({ visible, onClose, onGroupCreated }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddMemberEmail = () => {
    if (!memberEmail) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(memberEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (memberEmails.includes(memberEmail)) {
      Alert.alert('Error', 'This email is already added');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMemberEmails([...memberEmails, memberEmail]);
    setMemberEmail('');
  };

  const handleRemoveMemberEmail = (email: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMemberEmails(memberEmails.filter(e => e !== email));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      await groupAPI.create(name.trim(), description.trim(), memberEmails);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Group created successfully!');
      
      // Reset form
      setName('');
      setDescription('');
      setMemberEmails([]);
      setMemberEmail('');
      
      onGroupCreated();
      onClose();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMsg = error.response?.data?.error || 'Failed to create group';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setMemberEmails([]);
    setMemberEmail('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create New Group</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Group Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Roommates, Trip to NYC"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a description for this group"
                placeholderTextColor={Colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Members (Optional)</Text>
              <Text style={styles.sectionDescription}>
                Add members by their email address. They must have an account already.
              </Text>

              <View style={styles.addMemberRow}>
                <TextInput
                  style={[styles.input, styles.memberInput]}
                  placeholder="bob@test.com"
                  placeholderTextColor={Colors.textTertiary}
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleAddMemberEmail}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddMemberEmail}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              {memberEmails.length > 0 && (
                <View style={styles.membersList}>
                  {memberEmails.map((email, index) => (
                    <View key={index} style={styles.memberChip}>
                      <Text style={styles.memberEmail}>{email}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveMemberEmail(email)}
                        style={styles.removeButton}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.removeButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={loading || !name.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Creating...' : 'Create Group'}
              </Text>
            </TouchableOpacity>

            <View style={styles.tip}>
              <Text style={styles.tipText}>
                💡 Tip: You can add more members later from the group details page
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
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
    padding: Spacing.lg,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cancelText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  section: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  addMemberRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  memberInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    ...Shadows.sm,
  },
  addButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  memberEmail: {
    ...Typography.caption,
    color: Colors.textPrimary,
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    ...Typography.bodyBold,
    color: Colors.error,
    fontSize: 16,
    lineHeight: 16,
  },
  createButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
    ...Shadows.md,
  },
  createButtonDisabled: {
    backgroundColor: Colors.gray400,
    opacity: 0.6,
  },
  createButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  tip: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.info + '10',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.info + '30',
  },
  tipText: {
    ...Typography.caption,
    color: Colors.info,
  },
});
