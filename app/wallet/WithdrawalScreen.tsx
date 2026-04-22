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
import { BASE_URL, CoreService } from '@/helpers/core-service';
import { useToast } from '@/contexts/toast-content';
import ConfirmationModal from '../modal';

const { width } = Dimensions.get('window');

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
  const [amountFocused, setAmountFocused] = useState(false);
  
  
  // Bank details state
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bank_name: '',
    bank_code: '',
    account_number: '',
    account_name: '',
  });
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

  // Predefined withdrawal amounts
  const quickAmounts: number[] = [1000, 2000, 5000, 10000, 20000, 50000];
  
  const MIN_WITHDRAWAL = 100;
  const MAX_WITHDRAWAL = 5000000;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchWalletBalance();
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

  const fetchWalletBalance = async () => {
    try {
      setIsFetchingBalance(true);
      
      const response = await fetch(`${BASE_URL}/api/wallet/balance`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.balance !== undefined) {
          setWalletBalance(parseFloat(data.balance));
        } else if (data.wallet_balance !== undefined) {
          setWalletBalance(parseFloat(data.wallet_balance));
        } else {
          const possibleFields = ['available_balance', 'current_balance', 'total_balance'];
          for (const field of possibleFields) {
            if (data[field] !== undefined) {
              setWalletBalance(parseFloat(data[field]));
              break;
            }
          }
        }
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
      showToast('Please enter withdrawal amount', 'error');
      //Alert.alert('Error', 'Please enter withdrawal amount');
      return;
    }

    const withdrawAmount = parseFloat(amount);
    const validation = validateWithdrawal(withdrawAmount);
    
    if (!validation.valid) {
      showToast(validation.message || 'Invalid withdrawal details', 'error');
      //Alert.alert('Error', validation.message);
      return;
    }

    const newBalance = walletBalance - withdrawAmount;
    setModalMessages({
      title: 'Confirm Withdrawal',
      message: 'Confirm Withdrawal' + 
      `Amount: ₦${withdrawAmount.toLocaleString()}\n\n` +
      `Bank: ${bankDetails.bank_name}\n` +
      `Account: ${bankDetails.account_number}\n` +
      `Name: ${bankDetails.account_name}\n\n` +
      `New Balance: ₦${newBalance.toLocaleString()}`,
      variant: 'primary',
      onclick: async () => {
        await submitWithdrawalRequest(withdrawAmount);
      },
      onCancel: () => {
        setOpen(false);
      },
    });
    setOpen(true);

    // Alert.alert(
    //   'Confirm Withdrawal',
    //   `Amount: ₦${withdrawAmount.toLocaleString()}\n\n` +
    //   `Bank: ${bankDetails.bank_name}\n` +
    //   `Account: ${bankDetails.account_number}\n` +
    //   `Name: ${bankDetails.account_name}\n\n` +
    //   `New Balance: ₦${newBalance.toLocaleString()}`,
    //   [
    //     { text: 'Cancel', style: 'cancel' },
    //     { 
    //       text: 'Submit Request', 
    //       style: 'default',
    //       onPress: async () => {
    //         await submitWithdrawalRequest(withdrawAmount);
    //       }
    //     }
    //   ]
   // );
  };

  const submitWithdrawalRequest = async (withdrawAmount: number) => {
    setLoading(true);

    try {
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
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid server response');
      }

      if (response.ok && data.success) {
        const newBalance = walletBalance - withdrawAmount;
        setWalletBalance(newBalance);
        setModalMessages({
          title: 'Request Submitted!',
          message: `Your withdrawal request has been submitted for approval.\n\n` +
                   `Amount: ₦${withdrawAmount.toLocaleString()}\n` +
                   `To: ${bankDetails.account_name}\n` +
                   `New Balance: ₦${newBalance.toLocaleString()}`,
          variant: 'success',
          onclick: () => {
            setAmount('');
            setBankDetails({
              bank_name: '',
              bank_code: '',
              account_number: '',
              account_name: '',
            });
            router.back();
          },
          onCancel: () => {
            setOpen(false);
          },
        });
        setOpen(true);
        // Alert.alert(
        //   'Request Submitted!', 
        //   `Your withdrawal request has been submitted for approval.\n\n` +
        //   `Amount: ₦${withdrawAmount.toLocaleString()}\n` +
        //   `To: ${bankDetails.account_name}\n` +
        //   `New Balance: ₦${newBalance.toLocaleString()}`,
        //   [
        //     { 
        //       text: 'OK', 
        //       onPress: () => {
        //         setAmount('');
        //         setBankDetails({
        //           bank_name: '',
        //           bank_code: '',
        //           account_number: '',
        //           account_name: '',
        //         });
        //         router.back();
        //       }
        //     }
        //   ]
        //);

      } else {
        const errorMsg = data.message || data.error || 'Failed to submit withdrawal request';
        showToast(errorMsg, 'error');
      }
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      showToast(error.message || 'Network error. Please try again.', 'error');
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
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header with Gradient */}
      <LinearGradient
        colors={['#185FA5', '#0F4A7A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitleWhite}>Withdraw Funds</Text>
          <TouchableOpacity onPress={navigateToWithdrawalHistory} style={styles.historyButton}>
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
            {/* Balance Display */}
            <View style={styles.balanceCard}>
              <LinearGradient
                colors={['#EFF6FF', '#E0F2FE']}
                style={styles.balanceGradient}
              >
                <View style={styles.balanceHeader}>
                  <View style={styles.balanceIconContainer}>
                    <Ionicons name="wallet-outline" size={20} color="#185FA5" />
                  </View>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                  {isFetchingBalance ? (
                    <ActivityIndicator size="small" color="#185FA5" />
                  ) : (
                    <TouchableOpacity 
                      style={styles.refreshButton}
                      onPress={fetchWalletBalance}
                    >
                      <Ionicons name="refresh-outline" size={18} color="#185FA5" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.balanceAmount}>₦{walletBalance.toLocaleString()}</Text>
              </LinearGradient>
            </View>

            {/* Amount Input Section */}
            <View style={styles.section}>
              <Text style={styles.label}>Withdrawal Amount</Text>
              <View style={[styles.amountWrapper, amountFocused && styles.amountWrapperFocused]}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholderTextColor="#9CA3AF"
                  maxLength={9}
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                />
              </View>
              
              {/* Amount Limits */}
              <View style={styles.amountLimits}>
                <View style={styles.limitItem}>
                  <Ionicons name="arrow-up-outline" size={12} color="#8E8E93" />
                  <Text style={styles.limitText}>Min: ₦{MIN_WITHDRAWAL.toLocaleString()}</Text>
                </View>
                <View style={styles.limitItem}>
                  <Ionicons name="arrow-down-outline" size={12} color="#8E8E93" />
                  <Text style={styles.limitText}>Max: ₦{MAX_WITHDRAWAL.toLocaleString()}</Text>
                </View>
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
                  <Text style={styles.summaryTitle}>Transaction Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Withdrawal Amount</Text>
                    <Text style={styles.summaryValue}>₦{withdrawAmount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Current Balance</Text>
                    <Text style={styles.summaryValue}>₦{walletBalance.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryTotalLabel}>New Balance</Text>
                    <Text style={styles.summaryTotalValue}>₦{newBalance.toLocaleString()}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Bank Details Section */}
            <View style={styles.section}>
              <Text style={styles.label}>Bank Account Details</Text>
              
              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Bank Name *"
                  placeholderTextColor="#9CA3AF"
                  value={bankDetails.bank_name}
                  onChangeText={(text) => setBankDetails(prev => ({ ...prev, bank_name: text }))}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="card-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Bank Code (Optional)"
                  placeholderTextColor="#9CA3AF"
                  value={bankDetails.bank_code}
                  onChangeText={(text) => setBankDetails(prev => ({ ...prev, bank_code: text }))}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="keypad-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Account Number *"
                  placeholderTextColor="#9CA3AF"
                  value={bankDetails.account_number}
                  onChangeText={(text) => setBankDetails(prev => ({ ...prev, account_number: text }))}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Account Name *"
                  placeholderTextColor="#9CA3AF"
                  value={bankDetails.account_name}
                  onChangeText={(text) => setBankDetails(prev => ({ ...prev, account_name: text }))}
                />
              </View>

              <View style={styles.bankNote}>
                <Ionicons name="information-circle-outline" size={16} color="#FF9500" />
                <Text style={styles.bankNoteText}>
                  Please ensure bank details are correct. Admin will verify before processing.
                </Text>
              </View>
            </View>

            {/* Withdraw Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.withdrawButton,
                  !canWithdraw && styles.withdrawButtonDisabled
                ]}
                onPress={handleWithdraw}
                disabled={!canWithdraw || loading}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
              >
                <LinearGradient
                  colors={!canWithdraw ? ['#D1D5DB', '#D1D5DB'] : ['#185FA5', '#0F4A7A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="arrow-down-outline" size={20} color="#fff" />
                      <Text style={styles.withdrawButtonText}>
                        {isAmountValid ? 'Submit Withdrawal Request' : 'Enter Amount'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Processing Notice */}
            <View style={styles.noticeSection}>
              <View style={styles.noticeIcon}>
                <Ionicons name="time-outline" size={18} color="#FF9500" />
              </View>
              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle}>Processing Time</Text>
                <Text style={styles.noticeText}>
                  Withdrawal requests are processed manually within 24 hours. 
                  You&apos;ll be notified when your request is approved.
                </Text>
              </View>
            </View>

            {/* Security Notice */}
            <View style={styles.securitySection}>
              <View style={styles.securityIcon}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#34C759" />
              </View>
              <Text style={styles.securityText}>
                Your funds are safe. All withdrawals require admin verification for security.
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  historyButton: {
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
  balanceCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceGradient: {
    padding: 20,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(24, 95, 165, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  balanceLabel: {
    flex: 1,
    fontSize: 13,
    color: '#185FA5',
    fontWeight: '500',
  },
  refreshButton: {
    padding: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#185FA5',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
  },
  amountWrapperFocused: {
    borderColor: '#185FA5',
    backgroundColor: '#fff',
    shadowColor: '#185FA5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: '#185FA5',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: '700',
    color: '#185FA5',
  },
  amountLimits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  limitText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  quickAmountLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 20,
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
    minWidth: 80,
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
  summaryContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#185FA5',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
  },
  bankNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FEFCE8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  bankNoteText: {
    fontSize: 12,
    color: '#854D0E',
    flex: 1,
    lineHeight: 16,
  },
  withdrawButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginVertical: 20,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  withdrawButtonDisabled: {
    opacity: 0.6,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noticeSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 14,
    marginBottom: 12,
  },
  noticeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,149,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  securitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
  },
  securityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(52,199,89,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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