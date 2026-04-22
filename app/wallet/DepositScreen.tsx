import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { BASE_URL } from '@/helpers/core-service';
import { useToast } from '@/contexts/toast-content';
import ConfirmationModal from '../modal';

const { width } = Dimensions.get('window');

export default function DepositScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [depositData, setDepositData] = useState<{
    invoice_number: string;
    amount: number;
    bank_account: {
      bank_name: string;
      account_number: string;
      account_name: string;
    };
    instructions: string;
    status: string;
  } | null>(null);
  const [step, setStep] = useState<'input' | 'details' | 'pending'>('input');
  const [depositHistory, setDepositHistory] = useState<any[]>([]);
  const {showToast} = useToast();
    const [open, setOpen] = useState(false);
      const [modalMessages, setModalMessages] = useState({
        title: '',
        message: '',
        variant: 'primary' as 'primary' | 'danger' | 'success',
        onclick: () => {},
        onCancel: () => {
          setOpen(false);
        },
      });
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Predefined amount buttons
  const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatAmount = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return numericValue;
  };

  const requestDeposit = async () => {
    if (!amount) {
      showToast('Please enter an amount', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 100) {
      showToast('Minimum deposit amount is ₦100', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (amountNum > 5000000) {
      showToast('Maximum deposit amount is ₦5,000,000', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await fetch(`${BASE_URL}/api/wallet/fund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ amount: amountNum }),
      });

      const data = await response.json();

      if (data.success) {
        setDepositData(data.data);
        setStep('details');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchDepositHistory();
        showToast('Deposit request created successfully');
      } else {
        showToast(data.message || 'Failed to create deposit request', 'error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Deposit request error:', error);
      showToast('Network error. Please check your connection and try again.', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepositHistory = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/wallet/deposits?limit=5&status=pending`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setDepositHistory(data.deposits || []);
      }
    } catch (error) {
      console.error('Fetch deposit history error:', error);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      showToast('Copied to clipboard');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Copy to clipboard error:', error);
      showToast('Failed to copy to clipboard','error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const shareDepositDetails = async () => {
    if (!depositData) return;
    
    const message = `📥 Deposit Instructions\n\n` +
                    `Invoice: ${depositData.invoice_number}\n` +
                    `Amount: ₦${depositData.amount.toLocaleString()}\n\n` +
                    `Bank: ${depositData.bank_account.bank_name}\n` +
                    `Account: ${depositData.bank_account.account_number}\n` +
                    `Name: ${depositData.bank_account.account_name}\n\n` +
                    `Instructions: Use invoice number as narration`;
    
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'Deposit Details',
            text: message,
          });
        } else {
          await Clipboard.setStringAsync(message);
          showToast('Details copied to clipboard');
          //Alert.alert('Copied!', 'Details copied to clipboard');
        }
      } else {
        await Sharing.shareAsync(message, {
          dialogTitle: 'Share Deposit Details',
          mimeType: 'text/plain',
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      await Clipboard.setStringAsync(message);
      showToast('Details copied to clipboard');
     // Alert.alert('Copied!', 'Details copied to clipboard');
    }
  };

  const markAsPaid = () => {
    if (!depositData) return;
    setModalMessages({
      title: 'Proof of Payment',
      message: 'Have you completed the transfer? Please contact support with your payment proof if needed.',
      variant: 'primary',
      onclick: () => {
        setStep('pending');
        showToast('Deposit submitted and pending approval');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setOpen(false);
      },
      onCancel: () => {
        setOpen(false);
      },
    }); 
    setOpen(true);

    // Alert.alert(
    //   'Proof of Payment',
    //   'Have you completed the transfer? Please contact support with your payment proof if needed.',
    //   [
    //     { text: 'Cancel', style: 'cancel' },
    //     { 
    //       text: 'Yes, I\'ve Paid', 
    //       onPress: () => {
    //         setStep('pending');
    //         Alert.alert(
    //           'Deposit Submitted',
    //           'Your deposit is pending approval. Admin will review and credit your wallet shortly.',
    //           [{ text: 'OK', onPress: () => router.back() }]
    //         );
    //       }
    //     }
    //   ]
    // );
  };

  const cancelDeposit = () => {
    setModalMessages({
      title: 'Cancel Deposit',
      message: 'Are you sure you want to cancel this deposit request?',
      variant: 'danger',
      onclick: () => {
        setStep('input');
        setDepositData(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setOpen(false);
      },
      onCancel: () => {
        setOpen(false);
      }
    });
    setOpen(true);
    // Alert.alert(
    //   'Cancel Deposit',
    //   'Are you sure you want to cancel this deposit request?',
    //   [
    //     { text: 'No', style: 'cancel' },
    //     { 
    //       text: 'Yes, Cancel', 
    //       style: 'destructive',
    //       onPress: () => {
    //         setStep('input');
    //         setDepositData(null);
    //         Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    //       }
    //     }
    //   ]
    // );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#34C759';
      case 'pending':
        return '#FF9500';
      case 'rejected':
        return '#FF3B30';
      case 'cancelled':
        return '#8E8E93';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'rejected':
        return 'close-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  // Step 2: Show deposit details
  if (step === 'details' && depositData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <LinearGradient
          colors={['#185FA5', '#0F4A7A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={cancelDeposit} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitleWhite}>Deposit Instructions</Text>
            <TouchableOpacity onPress={shareDepositDetails} style={styles.headerButton}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Invoice Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="document-text-outline" size={20} color="#185FA5" />
              </View>
              <Text style={styles.sectionTitle}>Invoice Details</Text>
            </View>
            
            <View style={styles.invoiceCard}>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Invoice Number</Text>
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(depositData.invoice_number)}
                >
                  <Text style={styles.invoiceNumber}>{depositData.invoice_number}</Text>
                  <Ionicons name="copy-outline" size={18} color="#185FA5" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Amount</Text>
                <Text style={styles.amountValue}>₦{depositData.amount.toLocaleString()}</Text>
              </View>
              
              <View style={styles.statusBadge}>
                <Ionicons name="time-outline" size={16} color="#FF9500" />
                <Text style={[styles.statusText, { color: '#FF9500' }]}>Pending Payment</Text>
              </View>
            </View>
          </View>

          {/* Bank Account Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="business-outline" size={20} color="#34C759" />
              </View>
              <Text style={styles.sectionTitle}>Bank Account Details</Text>
            </View>
            
            <View style={styles.bankCard}>
              {[
                { label: 'Bank Name', value: depositData.bank_account.bank_name, icon: 'business-outline' },
                { label: 'Account Number', value: depositData.bank_account.account_number, icon: 'card-outline' },
                { label: 'Account Name', value: depositData.bank_account.account_name, icon: 'person-outline' },
              ].map((item, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.bankRow}
                  onPress={() => copyToClipboard(item.value)}
                >
                  <View style={styles.bankRowLeft}>
                    <Ionicons name={item.icon as any} size={18} color="#666" />
                    <View>
                      <Text style={styles.bankLabel}>{item.label}</Text>
                      <Text style={styles.bankValue}>{item.value}</Text>
                    </View>
                  </View>
                  <Ionicons name="copy-outline" size={18} color="#185FA5" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="information-circle-outline" size={20} color="#FF9500" />
              </View>
              <Text style={styles.sectionTitle}>Instructions</Text>
            </View>
            
            <View style={styles.instructionsCard}>
              {[
                'Copy the invoice number above',
                'Make a transfer to the bank account shown',
                'Use the invoice number as narration/remark',
                'Your wallet will be credited after admin verification'
              ].map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={styles.instructionNumber}>
                    <Text style={styles.instructionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
              
              <View style={styles.noteBox}>
                <Ionicons name="warning-outline" size={16} color="#FF9500" />
                <Text style={styles.noteText}>
                  Always use invoice number as narration to speed up verification
                </Text>
              </View>
            </View>
          </View>

          {/* Recent Deposits */}
          {depositHistory.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="time-outline" size={20} color="#666" />
                </View>
                <Text style={styles.sectionTitle}>Recent Deposits</Text>
              </View>
              
              <View style={styles.historyCard}>
                {depositHistory.slice(0, 3).map((deposit, index) => (
                  <View key={deposit.id} style={[
                    styles.historyItem,
                    index < depositHistory.length - 1 && styles.historyItemBorder
                  ]}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyInvoice}>{deposit.invoice_number}</Text>
                      <Text style={styles.historyDate}>
                        {new Date(deposit.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyAmount}>
                        ₦{parseFloat(deposit.amount).toLocaleString()}
                      </Text>
                      <View style={[
                        styles.statusBadgeSmall,
                        { backgroundColor: `${getStatusColor(deposit.status)}15` }
                      ]}>
                        <Ionicons 
                          name={getStatusIcon(deposit.status) as any} 
                          size={10} 
                          color={getStatusColor(deposit.status)} 
                        />
                        <Text style={[
                          styles.statusTextSmall, 
                          { color: getStatusColor(deposit.status) }
                        ]}>
                          {deposit.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={shareDepositDetails}
            >
              <Ionicons name="share-outline" size={20} color="#666" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
            
            <Animated.View style={{ flex: 1, transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.paidButton]}
                onPress={markAsPaid}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.paidButtonText}>I&apos;ve Paid</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Support */}
          <View style={styles.supportSection}>
            <Ionicons name="help-circle-outline" size={16} color="#8E8E93" />
            <Text style={styles.supportText}>Need help? Contact support@bustling.com</Text>
          </View>
          
          <View style={styles.bottomSpacing} />
        </ScrollView>
      <ConfirmationModal visible={open} onCancel={modalMessages.onCancel} onConfirm={modalMessages.onclick} message={modalMessages.message} title={modalMessages.title} />

      </SafeAreaView>
    );
  }

  // Step 3: Pending approval screen
  if (step === 'pending') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />

        <LinearGradient
          colors={['#185FA5', '#0F4A7A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitleWhite}>Deposit Status</Text>
            <View style={styles.headerButton} />
          </View>
        </LinearGradient>

        <View style={styles.pendingContent}>
          <View style={styles.pendingIconContainer}>
            <LinearGradient
              colors={['#FFF3E0', '#FFE0B2']}
              style={styles.pendingIconCircle}
            >
              <Ionicons name="time-outline" size={60} color="#FF9500" />
            </LinearGradient>
          </View>
          
          <Text style={styles.pendingTitle}>Pending Approval</Text>
          
          <Text style={styles.pendingText}>
            Your deposit of ₦{depositData?.amount.toLocaleString()} has been submitted.
            Our admin team will verify your payment and credit your wallet shortly.
          </Text>
          
          {depositData && (
            <View style={styles.pendingDetails}>
              <Text style={styles.pendingDetailLabel}>Invoice Number</Text>
              <Text style={styles.pendingDetailValue}>{depositData.invoice_number}</Text>
            </View>
          )}
          
          <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => router.back()}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
            >
              <LinearGradient
                colors={['#185FA5', '#0F4A7A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneButtonGradient}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          <TouchableOpacity
            style={styles.supportLink}
            onPress={() => {}}
          >
            <Text style={styles.supportLinkText}>Need help? Contact Support</Text>
          </TouchableOpacity>
        </View>
      <ConfirmationModal visible={open} onCancel={modalMessages.onCancel} onConfirm={modalMessages.onclick} message={modalMessages.message} title={modalMessages.title} />

      </SafeAreaView>
    );
  }

  // Step 1: Input amount (default view)
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient
        colors={['#185FA5', '#0F4A7A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitleWhite}>Deposit Funds</Text>
          <TouchableOpacity onPress={() => router.push('/wallet/Deposit-history')} style={styles.headerButton}>
            <Ionicons name="time-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Amount Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Enter Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={(text) => setAmount(formatAmount(text))}
                  placeholderTextColor="#9CA3AF"
                  selectionColor="#185FA5"
                />
              </View>
              
              {/* Quick Amount Buttons */}
              <Text style={styles.quickAmountLabel}>Quick Select</Text>
              <View style={styles.quickAmountContainer}>
                {quickAmounts.map((quickAmount) => (
                  <TouchableOpacity
                    key={quickAmount}
                    style={[
                      styles.quickAmountButton,
                      amount === quickAmount.toString() && styles.quickAmountButtonSelected
                    ]}
                    onPress={() => handleQuickAmount(quickAmount)}
                  >
                    <Text style={[
                      styles.quickAmountText,
                      amount === quickAmount.toString() && styles.quickAmountTextSelected
                    ]}>
                      ₦{quickAmount.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Info Cards */}
            <View style={styles.infoCards}>
              <View style={styles.infoCard}>
                <View style={[styles.infoCardIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="time-outline" size={22} color="#FF9500" />
                </View>
                <Text style={styles.infoCardTitle}>Manual Verification</Text>
                <Text style={styles.infoCardText}>
                  Deposits are verified manually within 1-24 hours
                </Text>
              </View>
              
              <View style={styles.infoCard}>
                <View style={[styles.infoCardIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="shield-checkmark-outline" size={22} color="#34C759" />
                </View>
                <Text style={styles.infoCardTitle}>Secure Transfer</Text>
                <Text style={styles.infoCardText}>
                  Transfer directly to our secure business account
                </Text>
              </View>
            </View>

            {/* Deposit Limits */}
            <View style={styles.limitsSection}>
              <Text style={styles.limitsTitle}>Deposit Limits</Text>
              <View style={styles.limitRow}>
                <Ionicons name="arrow-up-outline" size={16} color="#8E8E93" />
                <Text style={styles.limitText}>Minimum: ₦100</Text>
              </View>
              <View style={styles.limitRow}>
                <Ionicons name="arrow-down-outline" size={16} color="#8E8E93" />
                <Text style={styles.limitText}>Maximum: ₦5,000,000</Text>
              </View>
            </View>

            {/* Proceed Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.proceedButton,
                  (!amount || loading) && styles.proceedButtonDisabled
                ]}
                onPress={requestDeposit}
                disabled={!amount || loading}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
              >
                <LinearGradient
                  colors={(!amount || loading) ? ['#D1D5DB', '#D1D5DB'] : ['#185FA5', '#0F4A7A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.proceedButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.proceedButtonText}>Generate Invoice</Text>
                      <Ionicons name="arrow-forward-outline" size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer Note */}
            <View style={styles.footerNote}>
              <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
              <Text style={styles.footerNoteText}>
                After generating invoice, you&apos;ll receive bank details for transfer
              </Text>
            </View>
            
            <View style={styles.bottomSpacing} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmationModal visible={open} onCancel={modalMessages.onCancel} onConfirm={modalMessages.onclick} message={modalMessages.message} title={modalMessages.title} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerTitleWhite: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    color: '#374151',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#185FA5',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: '#185FA5',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 28,
    fontWeight: '700',
    color: '#185FA5',
  },
  quickAmountLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 24,
    marginBottom: 12,
    fontWeight: '500',
  },
  quickAmountContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickAmountButtonSelected: {
    backgroundColor: '#185FA5',
    borderColor: '#185FA5',
  },
  quickAmountText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  quickAmountTextSelected: {
    color: '#fff',
  },
  infoCards: {
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  limitsSection: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  limitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  limitText: {
    fontSize: 14,
    color: '#6B7280',
  },
  proceedButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  proceedButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  proceedButtonDisabled: {
    opacity: 0.6,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  footerNoteText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    flex: 1,
  },
  // Deposit Details Styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  invoiceCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#185FA5',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bankCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bankRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  bankValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  instructionsCard: {
    backgroundColor: '#FEFCE8',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#185FA5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEF08A',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
    lineHeight: 16,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyLeft: {
    flex: 1,
  },
  historyInvoice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 11,
    color: '#8E8E93',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  paidButton: {
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  paidButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  supportSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  supportText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  // Pending Screen Styles
  pendingContent: {
    flex: 1,
    alignItems: 'center',
    padding: 40,
    justifyContent: 'center',
  },
  pendingIconContainer: {
    marginBottom: 32,
  },
  pendingIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  pendingText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  pendingDetails: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pendingDetailLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  pendingDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#185FA5',
  },
  doneButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  doneButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  supportLink: {
    marginTop: 24,
  },
  supportLinkText: {
    color: '#185FA5',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});