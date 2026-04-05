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
import { BASE_URL } from '@/helpers/core-service';

interface BankDetails {
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
}

export default function WithdrawScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  
  // Bank details state
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bank_name: '',
    bank_code: '',
    account_number: '',
    account_name: '',
  });

  // Predefined withdrawal amounts
  const quickAmounts: number[] = [1000, 2000, 5000, 10000, 20000, 50000];
  
  const MIN_WITHDRAWAL = 100;
  const MAX_WITHDRAWAL = 5000000;

  // Fetch wallet balance on mount
  React.useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      setIsFetchingBalance(true);
      console.log('Fetching wallet balance...');
      
      const response = await fetch(`${BASE_URL}/api/wallet/balance`, {
        credentials: 'include',
      });
      
      console.log('Balance response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Balance data received:', data);
        
        if (data.balance !== undefined) {
          setWalletBalance(parseFloat(data.balance));
        } else if (data.wallet_balance !== undefined) {
          setWalletBalance(parseFloat(data.wallet_balance));
        } else {
          console.log('No balance field found in response:', data);
          // Try to get balance from other possible fields
          const possibleFields = ['available_balance', 'current_balance', 'total_balance'];
          for (const field of possibleFields) {
            if (data[field] !== undefined) {
              setWalletBalance(parseFloat(data[field]));
              break;
            }
          }
        }
      } else {
        const errorText = await response.text();
        console.log('Balance fetch error:', errorText);
      }
    } catch (error: any) {
      console.error('Error fetching balance:', error.message || error);
    } finally {
      setIsFetchingBalance(false);
    }
  };

  const handleAmountChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setAmount(numericValue);
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const validateBankDetails = (): { valid: boolean; message?: string } => {
    if (!bankDetails.bank_name.trim()) {
      return { valid: false, message: 'Bank name is required' };
    }
    if (!bankDetails.account_number.trim() || bankDetails.account_number.length < 10) {
      return { valid: false, message: 'Valid account number is required (10 digits)' };
    }
    if (!bankDetails.account_name.trim()) {
      return { valid: false, message: 'Account name is required' };
    }
    return { valid: true };
  };

  const validateWithdrawal = (withdrawAmount: number): { valid: boolean; message?: string } => {
    if (isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAWAL) {
      return { 
        valid: false, 
        message: `Minimum withdrawal amount is ₦${MIN_WITHDRAWAL.toLocaleString()}` 
      };
    }

    if (withdrawAmount > MAX_WITHDRAWAL) {
      return { 
        valid: false, 
        message: `Maximum withdrawal amount is ₦${MAX_WITHDRAWAL.toLocaleString()}` 
      };
    }

    if (withdrawAmount > walletBalance) {
      return { 
        valid: false, 
        message: `Insufficient balance. Available: ₦${walletBalance.toLocaleString()}` 
      };
    }

    const bankValidation = validateBankDetails();
    if (!bankValidation.valid) {
      return bankValidation;
    }

    return { valid: true };
  };

  const handleWithdraw = async () => {
    if (!amount) {
      Alert.alert('Error', 'Please enter withdrawal amount');
      return;
    }

    const withdrawAmount = parseFloat(amount);
    const validation = validateWithdrawal(withdrawAmount);
    
    if (!validation.valid) {
      Alert.alert('Error', validation.message);
      return;
    }

    // Calculate new balance for display
    const newBalance = walletBalance - withdrawAmount;

    // Confirm withdrawal with all details
    Alert.alert(
      'Confirm Withdrawal Request',
      `Withdrawal Amount: ₦${withdrawAmount.toLocaleString()}\n\n` +
      `Bank: ${bankDetails.bank_name}\n` +
      `Account: ${bankDetails.account_number}\n` +
      `Name: ${bankDetails.account_name}\n\n` +
      `Current Balance: ₦${walletBalance.toLocaleString()}\n` +
      `New Balance: ₦${newBalance.toLocaleString()}\n\n` +
      `This request will be sent to admin for approval.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Submit Request', 
          style: 'default',
          onPress: async () => {
            await submitWithdrawalRequest(withdrawAmount);
          }
        }
      ]
    );
  };

  const submitWithdrawalRequest = async (withdrawAmount: number) => {
    setLoading(true);

    try {
      console.log('Submitting withdrawal request for:', withdrawAmount);
      
      const response = await fetch(`${BASE_URL}/api/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: withdrawAmount,
          bank_name: bankDetails.bank_name,
          bank_code: bankDetails.bank_code,
          account_number: bankDetails.account_number,
          account_name: bankDetails.account_name,
        }),
      });

      const responseText = await response.text();
      console.log('Withdrawal raw response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error('Invalid server response');
      }
      
      console.log('Withdrawal parsed response:', data);

      if (response.ok && data.success) {
        // Update local balance immediately
        const newBalance = walletBalance - withdrawAmount;
        setWalletBalance(newBalance);
        
        Alert.alert(
          'Request Submitted!', 
          `Your withdrawal request has been submitted for admin approval.\n\n` +
          `Amount: ₦${withdrawAmount.toLocaleString()}\n` +
          `To: ${bankDetails.account_name}\n` +
          `Bank: ${bankDetails.bank_name}\n` +
          `New Balance: ₦${newBalance.toLocaleString()}\n\n` +
          `Admin will process your request within 24 hours.`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Reset form
                setAmount('');
                setBankDetails({
                  bank_name: '',
                  bank_code: '',
                  account_number: '',
                  account_name: '',
                });
                router.back();
              }
            }
          ]
        );
      } else {
        const errorMsg = data.message || data.error || 'Failed to submit withdrawal request';
        Alert.alert('Error', errorMsg);
      }
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      Alert.alert(
        'Error', 
        error.message || 'Network error. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const navigateToWithdrawalHistory = () => {
    router.push('/wallet/withdrawalHistory' as any);
  };

  const withdrawAmount = parseFloat(amount) || 0;
  const isAmountValid = !isNaN(withdrawAmount) && withdrawAmount > 0;
  const newBalance = isAmountValid ? walletBalance - withdrawAmount : walletBalance;
  const canWithdraw = isAmountValid && 
                     withdrawAmount >= MIN_WITHDRAWAL && 
                     withdrawAmount <= MAX_WITHDRAWAL && 
                     withdrawAmount <= walletBalance &&
                     bankDetails.bank_name.trim() && 
                     bankDetails.account_number.trim() && 
                     bankDetails.account_name.trim();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Withdraw Funds</Text>
          <TouchableOpacity onPress={navigateToWithdrawalHistory}>
            <Ionicons name="time-outline" size={22} color="#007AFF" />
          </TouchableOpacity>
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
            {/* Balance Display */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                {isFetchingBalance ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={fetchWalletBalance}
                  >
                    <Ionicons name="refresh" size={16} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.balanceAmount}>₦{walletBalance.toLocaleString()}</Text>
            </View>

            {/* Amount Input Section */}
            <View style={styles.section}>
              <Text style={styles.label}>Withdrawal Amount (₦)</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                keyboardType="numeric"
                value={amount}
                onChangeText={handleAmountChange}
                placeholderTextColor="#999"
                maxLength={9}
              />
              
              {/* Amount Limits */}
              <View style={styles.amountLimits}>
                <Text style={styles.limitText}>
                  Min: ₦{MIN_WITHDRAWAL.toLocaleString()}
                </Text>
                <Text style={styles.limitText}>
                  Max: ₦{MAX_WITHDRAWAL.toLocaleString()}
                </Text>
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

              {/* Summary */}
              {isAmountValid && (
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Withdrawal Amount:</Text>
                    <Text style={styles.summaryValue}>₦{withdrawAmount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Current Balance:</Text>
                    <Text style={styles.summaryValue}>₦{walletBalance.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.newBalanceRow]}>
                    <Text style={styles.newBalanceLabel}>New Balance:</Text>
                    <Text style={styles.newBalanceValue}>
                      ₦{newBalance.toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Bank Details Section */}
            <View style={styles.section}>
              <Text style={styles.label}>Bank Account Details</Text>
              
              <Text style={styles.inputLabel}>Bank Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., First Bank, GTBank"
                value={bankDetails.bank_name}
                onChangeText={(text) => setBankDetails(prev => ({ ...prev, bank_name: text }))}
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Bank Code (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 011 for First Bank"
                value={bankDetails.bank_code}
                onChangeText={(text) => setBankDetails(prev => ({ ...prev, bank_code: text }))}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Account Number *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="10-digit account number"
                value={bankDetails.account_number}
                onChangeText={(text) => setBankDetails(prev => ({ ...prev, account_number: text }))}
                keyboardType="numeric"
                maxLength={10}
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Account Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Name as it appears on bank account"
                value={bankDetails.account_name}
                onChangeText={(text) => setBankDetails(prev => ({ ...prev, account_name: text }))}
                placeholderTextColor="#999"
              />

              <View style={styles.bankNote}>
                <Ionicons name="information-circle" size={16} color="#666" />
                <Text style={styles.bankNoteText}>
                  Ensure bank details are correct. Admin will verify before processing.
                </Text>
              </View>
            </View>

            {/* Withdraw Button */}
            <TouchableOpacity
              style={[
                styles.withdrawButton,
                !canWithdraw && styles.withdrawButtonDisabled
              ]}
              onPress={handleWithdraw}
              disabled={!canWithdraw || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.withdrawButtonText}>
                  {isAmountValid ? `Submit Withdrawal Request` : 'Enter Amount'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Processing Notice */}
            <View style={styles.noticeSection}>
              <Ionicons name="time" size={16} color="#FF9800" />
              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle}>Processing Time</Text>
                <Text style={styles.noticeText}>
                  Withdrawal requests are processed manually by admin within 24 hours. 
                  You&apos;ll be notified when your request is approved.
                </Text>
              </View>
            </View>

            {/* Security Notice */}
            <View style={styles.securitySection}>
              <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
              <Text style={styles.securityText}>
                Your funds are safe with us. All withdrawals require admin verification for security.
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
  balanceCard: {
    backgroundColor: '#f8f9ff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 5,
    position: 'relative',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
  },
  refreshButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 5,
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
  },
  amountInput: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#007AFF',
    backgroundColor: '#f8f9ff',
  },
  amountLimits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  limitText: {
    fontSize: 12,
    color: '#666',
  },
  quickAmountLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  quickAmountContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    minWidth: 80,
  },
  quickAmountButtonSelected: {
    backgroundColor: '#007AFF',
  },
  quickAmountText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  quickAmountTextSelected: {
    color: '#fff',
  },
  summaryContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  newBalanceRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  newBalanceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  newBalanceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#28a745',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  bankNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 15,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  bankNoteText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    lineHeight: 16,
  },
  withdrawButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  withdrawButtonDisabled: {
    backgroundColor: '#ccc',
    shadowColor: 'transparent',
    elevation: 0,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noticeSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    marginBottom: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  securitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  securityText: {
    fontSize: 12,
    color: '#2E7D32',
    flex: 1,
    lineHeight: 16,
  },
  bottomSpacing: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});