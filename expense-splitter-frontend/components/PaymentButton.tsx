import { Alert, Linking, StyleSheet, Text, TouchableOpacity } from 'react-native';

type PaymentButtonProps = {
  type: 'venmo' | 'zelle' | 'paypal';
  handle: string;
  amount: number;
  note?: string;
};

export default function PaymentButton({ type, handle, amount, note }: PaymentButtonProps) {
  const getPaymentLink = () => {
    const formattedAmount = amount.toFixed(2);
    const formattedNote = encodeURIComponent(note || 'Expense payment');

    switch (type) {
      case 'venmo':
        // Venmo deep link format
        return `venmo://paycharge?txn=pay&recipients=${handle}&amount=${formattedAmount}&note=${formattedNote}`;
      
      case 'zelle':
        // Zelle doesn't have a standard deep link, so we just open the app
        return 'zelle://';
      
      case 'paypal':
        // PayPal.me link
        const cleanHandle = handle.replace('@', '');
        return `https://paypal.me/${cleanHandle}/${formattedAmount}`;
      
      default:
        return '';
    }
  };

  const getButtonText = () => {
    switch (type) {
      case 'venmo':
        return '💙 Pay with Venmo';
      case 'zelle':
        return '⚡ Pay with Zelle';
      case 'paypal':
        return '💳 Pay with PayPal';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'venmo':
        return '#008CFF';
      case 'zelle':
        return '#6D1ED4';
      case 'paypal':
        return '#003087';
    }
  };

  const handlePress = async () => {
    const link = getPaymentLink();
    
    try {
      const canOpen = await Linking.canOpenURL(link);
      
      if (canOpen) {
        await Linking.openURL(link);
      } else {
        // App not installed or deep link not supported
        if (type === 'venmo') {
          Alert.alert(
            'Venmo Not Found',
            'Please install Venmo or copy this handle: ' + handle,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Copy Handle', onPress: () => Alert.alert('Copied!', handle) }
            ]
          );
        } else if (type === 'zelle') {
          Alert.alert(
            'Zelle Setup',
            `Send $${amount.toFixed(2)} to: ${handle}\n\nOpen your banking app and use Zelle.`,
            [{ text: 'OK' }]
          );
        } else if (type === 'paypal') {
          // PayPal web link should work
          await Linking.openURL(link);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open payment app');
    }
  };

  if (!handle) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: getButtonColor() }]}
      onPress={handlePress}
    >
      <Text style={styles.buttonText}>{getButtonText()}</Text>
      <Text style={styles.amountText}>${amount.toFixed(2)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  amountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});