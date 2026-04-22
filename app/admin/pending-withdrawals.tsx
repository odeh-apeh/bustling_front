import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '@/helpers/core-service';
import { useToast } from '@/contexts/toast-content';

const { width } = Dimensions.get('window');

interface Withdrawal {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_phone: string;
  amount: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  transaction_reference: string | null;
  admin_notes: string | null;
  processed_by: number | null;
  processed_at: string | null;
  created_at: string;
}

const API_URL = `${BASE_URL}`;

export default function PendingWithdrawalsScreen() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'mark_paid' | 'reject' | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const {showToast} = useToast();
  const [stats, setStats] = useState({
    total: 0,
    total_amount: 0,
  });

  const fetchPendingWithdrawals = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/pending-withdrawal`);
      
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals || []);
        // Calculate stats
        const totalAmount = (data.withdrawals || []).reduce((sum: number, w: Withdrawal) => sum + parseFloat(w.amount), 0);
        setStats({
          total: data.withdrawals?.length || 0,
          total_amount: totalAmount,
        });
      } else {
        const errorText = await response.text();
        showToast(`Failed to load withdrawals: ${errorText || response.status}`, 'error');
        //Alert.alert('Error', `Failed to load withdrawals: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      showToast('Network error. Please try again.', 'error');
     // Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingWithdrawals();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingWithdrawals();
  };

  const openActionModal = (withdrawal: Withdrawal, action: 'approve' | 'mark_paid' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setActionType(action);
    setTransactionRef('');
    setRejectionReason('');
    setActionModalVisible(true);
  };

  const confirmAction = () => {
    if (actionType === 'mark_paid' && !transactionRef.trim()) {
      showToast('Transaction reference is required to mark as paid', 'error');
      //Alert.alert('Error', 'Transaction reference is required');
      return;
    }
    if (actionType === 'reject' && !rejectionReason.trim()) {
      showToast('Please provide a reason for rejection', 'error');
      //Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }
    setConfirmationModalVisible(true);
  };

  const processWithdrawalAction = async () => {
    if (!selectedWithdrawal) return;

    setProcessing(selectedWithdrawal.id);
    setActionModalVisible(false);
    
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/approve-withdrawal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withdrawal_id: selectedWithdrawal.id,
          action: actionType,
          transaction_reference: actionType === 'mark_paid' ? transactionRef : undefined,
          notes: actionType === 'reject' ? rejectionReason : (actionType === 'approve' ? 'Approved by admin' : undefined),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message || `Withdrawal processed successfully`, 'success');
        //Alert.alert('Success', data.message || `Withdrawal processed successfully`);
        setWithdrawals(prev => prev.filter(w => w.id !== selectedWithdrawal.id));
        // Update stats
        setStats(prev => ({
          total: prev.total - 1,
          total_amount: prev.total_amount - parseFloat(selectedWithdrawal.amount),
        }));
        setConfirmationModalVisible(false);
        setSelectedWithdrawal(null);
        setActionType(null);
      } else {
        const error = await response.json();
        showToast(error.message || `Failed to process withdrawal`, 'error');
        //Alert.alert('Error', error.message || `Failed to process withdrawal`);
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      if (diffHours < 1) {
        const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        return `${diffMinutes} minutes ago`;
      }
      return `${diffHours} hours ago`;
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const getInitials = (name: string) => {
    return name?.charAt(0).toUpperCase() || 'U';
  };

  const getRandomColor = (id: number) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7B731'];
    return colors[id % colors.length];
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 8) return accountNumber;
    return `${accountNumber.slice(0, 6)}****${accountNumber.slice(-4)}`;
  };

  if (loading && withdrawals.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#0A6BFF" />
            <Text style={styles.loadingText}>Loading withdrawals...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          header: () => (
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Withdrawals</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                <Ionicons name="refresh-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0A6BFF']}
              tintColor="#0A6BFF"
            />
          }
        >
          {/* Stats Cards */}
          {withdrawals.length > 0 && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="time-outline" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="cash-outline" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.statNumber}>{formatAmount(stats.total_amount.toString())}</Text>
                <Text style={styles.statLabel}>Total Amount</Text>
              </View>
            </View>
          )}

          {withdrawals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="checkmark-circle" size={80} color="#34C759" />
              </View>
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptyText}>
                No pending withdrawals to process
              </Text>
              <TouchableOpacity style={styles.refreshEmptyButton} onPress={onRefresh}>
                <Ionicons name="refresh-outline" size={20} color="#0A6BFF" />
                <Text style={styles.refreshEmptyText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.totalText}>
                {withdrawals.length} pending request{withdrawals.length !== 1 ? 's' : ''}
              </Text>
              
              {withdrawals.map((withdrawal) => (
                <View key={withdrawal.id} style={styles.withdrawalCard}>
                  {/* Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                      <View style={[styles.userAvatar, { backgroundColor: getRandomColor(withdrawal.id) }]}>
                        <Text style={styles.avatarText}>
                          {getInitials(withdrawal.user_name)}
                        </Text>
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={styles.userName} numberOfLines={1}>
                          {withdrawal.user_name || 'Unknown User'}
                        </Text>
                        <View style={styles.userContactRow}>
                          <Ionicons name="call-outline" size={12} color="#999" />
                          <Text style={styles.userContact} numberOfLines={1}>
                            {withdrawal.user_phone || withdrawal.user_email || 'No contact'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.amountContainer}>
                      <Text style={styles.amountLabel}>Amount</Text>
                      <Text style={styles.amount}>{formatAmount(withdrawal.amount)}</Text>
                    </View>
                  </View>

                  {/* Bank Details */}
                  <TouchableOpacity 
                    style={styles.bankDetails}
                    onPress={() => setExpandedCard(expandedCard === withdrawal.id ? null : withdrawal.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.bankHeader}>
                      <View style={styles.bankHeaderLeft}>
                        <Ionicons name="business-outline" size={18} color="#0A6BFF" />
                        <Text style={styles.bankHeaderTitle}>Bank Account Details</Text>
                      </View>
                      <Ionicons 
                        name={expandedCard === withdrawal.id ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color="#999" 
                      />
                    </View>
                    
                    {(expandedCard === withdrawal.id) && (
                      <View style={styles.bankDetailsExpanded}>
                        <View style={styles.bankDetailRow}>
                          <Text style={styles.bankDetailLabel}>Bank Name</Text>
                          <Text style={styles.bankDetailValue}>{withdrawal.bank_name}</Text>
                        </View>
                        
                        <View style={styles.bankDetailRow}>
                          <Text style={styles.bankDetailLabel}>Account Number</Text>
                          <View style={styles.bankDetailValueContainer}>
                            <Text style={styles.bankDetailValue}>{maskAccountNumber(withdrawal.account_number)}</Text>
                            <TouchableOpacity onPress={() => {
                              Alert.alert('Account Number', withdrawal.account_number);
                            }}>
                              <Ionicons name="copy-outline" size={16} color="#0A6BFF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        <View style={styles.bankDetailRow}>
                          <Text style={styles.bankDetailLabel}>Account Name</Text>
                          <Text style={styles.bankDetailValue}>{withdrawal.account_name}</Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Request Info */}
                  <View style={styles.requestInfo}>
                    <View style={styles.infoItem}>
                      <Ionicons name="calendar-outline" size={14} color="#999" />
                      <Text style={styles.infoText}>
                        Requested: {formatDate(withdrawal.created_at)}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="time-outline" size={14} color="#999" />
                      <Text style={styles.infoText}>
                        ID: #{withdrawal.id}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => openActionModal(withdrawal, 'reject')}
                      disabled={processing === withdrawal.id}
                    >
                      {processing === withdrawal.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="close-circle" size={20} color="#fff" />
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => openActionModal(withdrawal, 'approve')}
                      disabled={processing === withdrawal.id}
                    >
                      {processing === withdrawal.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.markPaidButton]}
                      onPress={() => openActionModal(withdrawal, 'mark_paid')}
                      disabled={processing === withdrawal.id}
                    >
                      {processing === withdrawal.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="cash-outline" size={20} color="#fff" />
                          <Text style={styles.markPaidButtonText}>Mark Paid</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}
          
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>

      {/* Action Modal (Approve/Mark Paid/Reject) */}
      <Modal
        visible={actionModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionType === 'approve' && 'Approve Withdrawal'}
                {actionType === 'mark_paid' && 'Mark as Paid'}
                {actionType === 'reject' && 'Reject Withdrawal'}
              </Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedWithdrawal && (
              <ScrollView style={styles.modalBody}>
                {/* Amount Summary */}
                <View style={styles.modalAmountCard}>
                  <Text style={styles.modalAmountLabel}>Amount</Text>
                  <Text style={styles.modalAmountValue}>
                    {formatAmount(selectedWithdrawal.amount)}
                  </Text>
                  <View style={styles.modalUserInfo}>
                    <Text style={styles.modalUserName}>{selectedWithdrawal.user_name}</Text>
                    <Text style={styles.modalUserBank}>{selectedWithdrawal.bank_name}</Text>
                  </View>
                </View>

                {actionType === 'mark_paid' && (
                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>Transaction Reference *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter bank transaction reference"
                      placeholderTextColor="#999"
                      value={transactionRef}
                      onChangeText={setTransactionRef}
                    />
                    <View style={styles.infoBox}>
                      <Ionicons name="information-circle" size={20} color="#3B82F6" />
                      <Text style={styles.infoText}>
                        This reference will be recorded for audit purposes
                      </Text>
                    </View>
                  </View>
                )}

                {actionType === 'reject' && (
                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>Rejection Reason *</Text>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Explain why this withdrawal is being rejected..."
                      placeholderTextColor="#999"
                      value={rejectionReason}
                      onChangeText={setRejectionReason}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                    <View style={styles.infoBoxWarning}>
                      <Ionicons name="alert-circle" size={20} color="#EF4444" />
                      <Text style={styles.infoTextWarning}>
                        The user will be notified of this rejection
                      </Text>
                    </View>
                  </View>
                )}

                {actionType === 'approve' && (
                  <View style={styles.infoBox}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.infoTextSuccess}>
                      Approving will mark this withdrawal as approved. You can mark it as paid after sending the money.
                    </Text>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelModalButton]}
                    onPress={() => setActionModalVisible(false)}
                  >
                    <Text style={styles.cancelModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      actionType === 'reject' ? styles.rejectModalButton : 
                      actionType === 'mark_paid' ? styles.markPaidModalButton : 
                      styles.approveModalButton
                    ]}
                    onPress={confirmAction}
                  >
                    <Text style={styles.confirmModalButtonText}>
                      {actionType === 'approve' && 'Confirm Approval'}
                      {actionType === 'mark_paid' && 'Confirm Payment'}
                      {actionType === 'reject' && 'Confirm Rejection'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmationModalVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <Ionicons 
                name={actionType === 'reject' ? "warning" : "checkmark-circle"} 
                size={50} 
                color={actionType === 'reject' ? "#EF4444" : "#10B981"} 
              />
            </View>
            <Text style={styles.confirmTitle}>
              {actionType === 'approve' && 'Approve Withdrawal?'}
              {actionType === 'mark_paid' && 'Mark as Paid?'}
              {actionType === 'reject' && 'Reject Withdrawal?'}
            </Text>
            <Text style={styles.confirmMessage}>
              {actionType === 'approve' && `Approve withdrawal of ${selectedWithdrawal ? formatAmount(selectedWithdrawal.amount) : ''} for ${selectedWithdrawal?.user_name}?`}
              {actionType === 'mark_paid' && `Confirm that you have sent ${selectedWithdrawal ? formatAmount(selectedWithdrawal.amount) : ''} to ${selectedWithdrawal?.user_name}'s bank account?`}
              {actionType === 'reject' && `Reject withdrawal request of ${selectedWithdrawal ? formatAmount(selectedWithdrawal.amount) : ''} for ${selectedWithdrawal?.user_name}?`}
            </Text>
            {actionType === 'mark_paid' && transactionRef && (
              <View style={styles.referencePreview}>
                <Text style={styles.referencePreviewLabel}>Transaction Ref:</Text>
                <Text style={styles.referencePreviewText}>{transactionRef}</Text>
              </View>
            )}
            {actionType === 'reject' && rejectionReason && (
              <View style={styles.reasonPreview}>
                <Text style={styles.reasonPreviewLabel}>Reason:</Text>
                <Text style={styles.reasonPreviewText}>{rejectionReason}</Text>
              </View>
            )}
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCancelButton]}
                onPress={() => setConfirmationModalVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  actionType === 'reject' ? styles.confirmRejectButton : styles.confirmActionButton
                ]}
                onPress={processWithdrawalAction}
              >
                <Text style={styles.confirmActionText}>
                  {actionType === 'approve' && 'Yes, Approve'}
                  {actionType === 'mark_paid' && 'Yes, Mark Paid'}
                  {actionType === 'reject' && 'Yes, Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    height: 100,
    backgroundColor: '#0A6BFF',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  refreshEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshEmptyText: {
    fontSize: 14,
    color: '#0A6BFF',
    fontWeight: '600',
  },
  totalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  withdrawalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  userContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userContact: {
    fontSize: 11,
    color: '#999',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A6BFF',
  },
  bankDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  bankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  bankHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  bankDetailsExpanded: {
    padding: 12,
    paddingTop: 0,
    gap: 10,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankDetailLabel: {
    fontSize: 12,
    color: '#666',
  },
  bankDetailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankDetailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  requestInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 11,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  markPaidButton: {
    backgroundColor: '#0A6BFF',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  markPaidButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalAmountCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAmountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  modalAmountValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0A6BFF',
    marginBottom: 8,
  },
  modalUserInfo: {
    alignItems: 'center',
  },
  modalUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalUserBank: {
    fontSize: 12,
    color: '#666',
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  infoBoxWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  // infoText: {
  //   fontSize: 12,
  //   color: '#3B82F6',
  //   flex: 1,
  // },
  infoTextWarning: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
  infoTextSuccess: {
    fontSize: 12,
    color: '#10B981',
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f5f5f5',
  },
  approveModalButton: {
    backgroundColor: '#34C759',
  },
  markPaidModalButton: {
    backgroundColor: '#0A6BFF',
  },
  rejectModalButton: {
    backgroundColor: '#FF3B30',
  },
  cancelModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  confirmModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: width - 40,
    maxWidth: 340,
    alignItems: 'center',
  },
  confirmIconContainer: {
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  referencePreview: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  reasonPreview: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  referencePreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  referencePreviewText: {
    fontSize: 13,
    color: '#333',
  },
  reasonPreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 4,
  },
  reasonPreviewText: {
    fontSize: 13,
    color: '#333',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmCancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmActionButton: {
    backgroundColor: '#10B981',
  },
  confirmRejectButton: {
    backgroundColor: '#EF4444',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  confirmActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});