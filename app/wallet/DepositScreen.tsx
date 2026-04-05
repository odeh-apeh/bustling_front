import React, { useState } from 'react';
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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { BASE_URL } from '@/helpers/core-service';

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
  
  // Predefined amount buttons
  const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

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
      Alert.alert('Error', 'Please enter an amount');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 100) {
      Alert.alert('Error', 'Minimum deposit amount is ₦100');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (amountNum > 5000000) {
      Alert.alert('Error', 'Maximum deposit amount is ₦5,000,000');
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
      console.log('Deposit request response:', data);

      if (data.success) {
        setDepositData(data.data);
        setStep('details');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Fetch deposit history
        fetchDepositHistory();
      } else {
        Alert.alert('Error', data.message || 'Failed to create deposit request');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Deposit request error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
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
      Alert.alert('Copied!', 'Copied to clipboard');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Copy to clipboard error:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
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
          Alert.alert('Copied!', 'Details copied to clipboard');
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
      Alert.alert('Copied!', 'Details copied to clipboard');
    }
  };

  const markAsPaid = () => {
    if (!depositData) return;
    
    Alert.alert(
      'Proof of Payment',
      'Have you completed the transfer? Please contact support with your payment proof if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, I\'ve Paid', 
          onPress: () => {
            setStep('pending');
            Alert.alert(
              'Deposit Submitted',
              'Your deposit is pending approval. Admin will review and credit your wallet shortly.',
              [{ text: 'OK', onPress: () => router.back() }]
            );
          }
        }
      ]
    );
  };

  const cancelDeposit = () => {
    Alert.alert(
      'Cancel Deposit',
      'Are you sure you want to cancel this deposit request?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            setStep('input');
            setDepositData(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'rejected':
        return '#F44336';
      case 'cancelled':
        return '#9E9E9E';
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
        <View style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={cancelDeposit}>
              <Ionicons name="chevron-back" size={26} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Deposit Instructions</Text>
            <View style={{ width: 26 }} />
          </View>

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Invoice Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color="#007AFF" />
                <Text style={styles.sectionTitle}>Invoice Details</Text>
              </View>
              
              <View style={styles.invoiceCard}>
                <Text style={styles.invoiceLabel}>Invoice Number</Text>
                <TouchableOpacity 
                  style={styles.invoiceRow}
                  onPress={() => copyToClipboard(depositData.invoice_number)}
                >
                  <Text style={styles.invoiceNumber}>{depositData.invoice_number}</Text>
                  <Ionicons name="copy" size={20} color="#007AFF" />
                </TouchableOpacity>
                
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Amount</Text>
                  <Text style={styles.amountValue}>₦{depositData.amount.toLocaleString()}</Text>
                </View>
                
                <View style={styles.statusBadge}>
                  <Ionicons 
                    name="time" 
                    size={16} 
                    color="#FF9800" 
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.statusText, { color: '#FF9800' }]}>
                    Pending Payment
                  </Text>
                </View>
              </View>
            </View>

            {/* Bank Account Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="business" size={20} color="#4CAF50" />
                <Text style={styles.sectionTitle}>Bank Account Details</Text>
              </View>
              
              <View style={styles.bankCard}>
                {[
                  { label: 'Bank Name', value: depositData.bank_account.bank_name },
                  { label: 'Account Number', value: depositData.bank_account.account_number },
                  { label: 'Account Name', value: depositData.bank_account.account_name },
                ].map((item, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.bankRow}
                    onPress={() => copyToClipboard(item.value)}
                  >
                    <View>
                      <Text style={styles.bankLabel}>{item.label}</Text>
                      <Text style={styles.bankValue}>{item.value}</Text>
                    </View>
                    <Ionicons name="copy" size={18} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Instructions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={20} color="#FF9800" />
                <Text style={styles.sectionTitle}>Instructions</Text>
              </View>
              
              <View style={styles.instructionsCard}>
                <Text style={styles.instructionsText}>
                  1. Copy the invoice number above{'\n'}
                  2. Make a transfer to the bank account shown{'\n'}
                  3. Use the invoice number as narration/remark{'\n'}
                  4. Your wallet will be credited after admin verification
                </Text>
                
                <Text style={styles.noteText}>
                  ⚠️ Important: Always use invoice number as narration to speed up verification
                </Text>
              </View>
            </View>

            {/* Recent Deposits */}
            {depositHistory.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time" size={20} color="#666" />
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
                          { backgroundColor: `${getStatusColor(deposit.status)}20` }
                        ]}>
                          <Ionicons 
                            name={getStatusIcon(deposit.status) as any} 
                            size={12} 
                            color={getStatusColor(deposit.status)} 
                            style={{ marginRight: 2 }}
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
                <Ionicons name="share" size={20} color="#666" />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.paidButton]}
                onPress={markAsPaid}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.paidButtonText}>I&apos;ve Paid</Text>
              </TouchableOpacity>
            </View>

            {/* Support */}
            <View style={styles.supportSection}>
              <Ionicons name="help-circle" size={16} color="#666" />
              <Text style={styles.supportText}>
                Need help? Contact support@errandly.com
              </Text>
            </View>
            
            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // Step 3: Pending approval screen
  if (step === 'pending') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={26} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Deposit Status</Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={styles.pendingContent}>
            <View style={styles.pendingIconContainer}>
              <View style={styles.pendingIconCircle}>
                <Ionicons name="time" size={60} color="#FF9800" />
              </View>
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
            
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => router.back()}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.supportLink}
              onPress={() => {/* Navigate to support */}}
            >
              <Text style={styles.supportLinkText}>Need help? Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Step 1: Input amount (default view)
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Deposit Funds</Text>
          <View style={{ width: 26 }} />
        </View>

        <KeyboardAvoidingView 
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Amount Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Enter Amount (₦)</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={(text) => setAmount(formatAmount(text))}
                  placeholderTextColor="#999"
                  selectionColor="#007AFF"
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
                <Ionicons name="time" size={24} color="#FF9800" />
                <Text style={styles.infoCardTitle}>Manual Verification</Text>
                <Text style={styles.infoCardText}>
                  Deposits are verified manually by admin within 1-24 hours
                </Text>
              </View>
              
              <View style={styles.infoCard}>
                <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
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
                <Ionicons name="arrow-up" size={16} color="#666" />
                <Text style={styles.limitText}>Minimum: ₦100</Text>
              </View>
              <View style={styles.limitRow}>
                <Ionicons name="arrow-down" size={16} color="#666" />
                <Text style={styles.limitText}>Maximum: ₦5,000,000</Text>
              </View>
            </View>

            {/* Proceed Button */}
            <TouchableOpacity
              style={[
                styles.proceedButton,
                (!amount || loading) && styles.proceedButtonDisabled
              ]}
              onPress={requestDeposit}
              disabled={!amount || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                  <Text style={styles.proceedButtonText}>
                    Generate Invoice
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Recent Deposits Preview */}
            <TouchableOpacity 
              style={styles.historyPreview}
              onPress={() => router.push('/wallet/Deposit-history' as any)}
            >
              <View style={styles.historyPreviewHeader}>
                <Text style={styles.historyPreviewTitle}>Recent Deposits</Text>
                <Ionicons name="chevron-forward" size={18} color="#666" />
              </View>
              <Text style={styles.historyPreviewText}>
                View your deposit history and status
              </Text>
            </TouchableOpacity>

            {/* Footer Note */}
            <View style={styles.footerNote}>
              <Ionicons name="information-circle" size={16} color="#666" />
              <Text style={styles.footerNoteText}>
                After generating invoice, you&apos;ll receive bank details for transfer
              </Text>
            </View>
            
            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#333',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    backgroundColor: '#f8f9ff',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 28,
    fontWeight: '600',
    color: '#007AFF',
  },
  quickAmountLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 24,
    marginBottom: 12,
  },
  quickAmountContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  quickAmountButtonSelected: {
    backgroundColor: '#007AFF',
  },
  quickAmountText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  quickAmountTextSelected: {
    color: '#fff',
  },
  infoCards: {
    gap: 16,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  limitsSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  limitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  limitText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  proceedButtonDisabled: {
    backgroundColor: '#ccc',
    shadowColor: 'transparent',
    elevation: 0,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyPreview: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  historyPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  historyPreviewText: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
    textAlign: 'center',
    flex: 1,
  },
  // Deposit Details Styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  invoiceCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  invoiceNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bankCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bankLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  bankValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  instructionsCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
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
    borderBottomColor: '#f0f0f0',
  },
  historyLeft: {
    flex: 1,
  },
  historyInvoice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
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
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#eee',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  paidButton: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  paidButtonText: {
    fontSize: 16,
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
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  pendingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  pendingDetails: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 32,
  },
  pendingDetailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pendingDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  doneButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
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
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});