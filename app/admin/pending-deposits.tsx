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
import ConfirmationModal from '../modal';

const { width } = Dimensions.get('window');

interface Deposit {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_phone: string;
  invoice_number: string;
  amount: string;
  proof_image: string | null;
  narration: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_notes: string | null;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
}

const API_URL = `${BASE_URL}`;

export default function PendingDepositsScreen() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const {showToast} = useToast();
  const [open, setOpen] = useState(false);
  const [modalMessages, setModalMessages] = useState({
    title: '',
    message: '',
    variant: 'primary' as 'primary' | 'danger' | 'success',
    onclick: () => {},
    onCancel: () => {},
  });



  const fetchPendingDeposits = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      
      if (!token) {
        setModalMessages({
          title: 'Session Expired',
          message: 'Please login again',
          variant: 'danger',
          onclick: () => router.replace('/auth/account-support'),
          onCancel: () => {setOpen(false)},
        });
        setOpen(true);
        // Alert.alert('Session Expired', 'Please login again', [
        //   { text: 'OK', onPress: () => router.replace('/auth/account-support') }
        // ]);
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/pending-deposit`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDeposits(data.deposits || []);
      } else if (response.status === 401 || response.status === 403) {
        await AsyncStorage.removeItem('adminToken');
          setModalMessages({
            title: 'Session Expired',
            message: 'Please login again',
            variant: 'danger',
            onclick: () => router.replace('/auth/account-support'),
            onCancel: () => {setOpen(false)},
          });
          setOpen(true);
        // Alert.alert('Session Expired', 'Please login again', [
        //   { text: 'OK', onPress: () => router.replace('/auth/account-support') }
        // ]);
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to load pending deposits', 'error');
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingDeposits();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingDeposits();
  };

  const handleApprove = async (depositId: number) => {
    setModalMessages({
      title: 'Approve Deposit',
      message: 'Are you sure you want to approve this deposit?',
      variant: 'primary',
      onclick: async () => {
        await processDeposit(depositId, 'approve');
      },
      onCancel: () => {setOpen(false)},
    });
    setOpen(true);
    // Alert.alert(
    //   'Approve Deposit',
    //   'Are you sure you want to approve this deposit?',
    //   [
    //     { text: 'Cancel', style: 'cancel' },
    //     {
    //       text: 'Approve',
    //       style: 'default',
    //       onPress: async () => {
    //         await processDeposit(depositId, 'approve');
    //       }
    //     }
    //   ]
    // );
  };

  const handleReject = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (selectedDeposit) {
      await processDeposit(selectedDeposit.id, 'reject', rejectReason);
      setRejectModalVisible(false);
      setRejectReason('');
      setSelectedDeposit(null);
    }
  };

  const processDeposit = async (depositId: number, action: 'approve' | 'reject', notes?: string) => {
    setProcessing(depositId);
    
    try {
      const token = await AsyncStorage.getItem('adminToken');
      
      if (!token) {
        setModalMessages({
          title: 'Session Expired',
          message: 'Please login again',
          variant: 'danger',
          onclick: () => router.replace('/auth/account-support'),
          onCancel: () => {setOpen(false)},
        });
        setOpen(true);
        // Alert.alert('Session Expired', 'Please login again', [
        //   { text: 'OK', onPress: () => router.replace('/auth/account-support') }
        // ]);
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/approve-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          deposit_id: depositId,
          action: action,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message || `Deposit ${action}d successfully`, 'success');
       // Alert.alert('Success', data.message || `Deposit ${action}d successfully`);
        setDeposits(prev => prev.filter(deposit => deposit.id !== depositId));
      } else if (response.status === 401 || response.status === 403) {
        await AsyncStorage.removeItem('adminToken');
        setModalMessages({
          title: 'Session Expired',
          message: 'Please login again',
          variant: 'danger',
          onclick: () => router.replace('/auth/account-support'),
          onCancel: () => {setOpen(false)},
        });
        setOpen(true);
        // Alert.alert('Session Expired', 'Please login again', [
        //   { text: 'OK', onPress: () => router.replace('/auth/account-support') }
        // ]);
      } else {
        const error = await response.json();
        showToast(error.message || `Failed to ${action} deposit`, 'error');
        //Alert.alert('Error', error.message || `Failed to ${action} deposit`);
      }
    } catch (error) {
      console.error('Error processing deposit:', error);
      showToast('Network error. Please try again.', 'error');
      // Alert.alert('Error', 'Network error. Please try again.');
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

  const getInitials = (name: string) => {
    return name?.charAt(0).toUpperCase() || 'U';
  };

  const getRandomColor = (id: number) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7B731'];
    return colors[id % colors.length];
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const renderProofImage = (proof: any) => {
    if (!proof) return null;
    
    try {
      const proofData = typeof proof === 'string' ? JSON.parse(proof) : proof;
      if (proofData.path) {
        return (
          <TouchableOpacity 
            style={styles.proofImageContainer}
            onPress={() => {
              Alert.alert('Proof Image', 'Image available. Implement viewer as needed.');
            }}
          >
            <Ionicons name="image-outline" size={20} color="#0A6BFF" />
            <Text style={styles.proofText}>View Payment Proof</Text>
            <Ionicons name="chevron-forward" size={16} color="#0A6BFF" />
          </TouchableOpacity>
        );
      }
    } catch (e) {
      console.log('Error parsing proof image:', e);
    }
    
    return (
      <View style={styles.noProof}>
        <Ionicons name="cloud-upload-outline" size={20} color="#ccc" />
        <Text style={styles.noProofText}>No proof uploaded</Text>
      </View>
    );
  };

  if (loading && deposits.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#0A6BFF" />
          <Text style={styles.loadingText}>Loading deposits...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          header: () => (
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Pending Deposits</Text>
                {deposits.length > 0 && (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>{deposits.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                <Ionicons name="refresh-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      
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
        {deposits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#34C759" />
            </View>
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptyText}>
              No pending deposits to review
            </Text>
            <TouchableOpacity style={styles.refreshEmptyButton} onPress={onRefresh}>
              <Ionicons name="refresh-outline" size={20} color="#0A6BFF" />
              <Text style={styles.refreshEmptyText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={24} color="#FF9800" />
                <Text style={styles.statNumber}>{deposits.length}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="cash-outline" size={24} color="#0A6BFF" />
                <Text style={styles.statNumber}>
                  ₦{deposits.reduce((sum, d) => sum + parseFloat(d.amount), 0).toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Total Amount</Text>
              </View>
            </View>
            
            {deposits.map((deposit, index) => (
              <View
                key={deposit.id}
                style={[styles.depositCard, expandedCard === deposit.id && styles.depositCardExpanded]}
              >
                {/* Status Indicator - Moved to top-left */}
                <View style={styles.statusIndicator}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Pending Review</Text>
                </View>

                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.userInfo}>
                    <View style={[styles.userAvatar, { backgroundColor: getRandomColor(deposit.id) }]}>
                      <Text style={styles.avatarText}>
                        {getInitials(deposit.user_name)}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {deposit.user_name || 'Unknown User'}
                      </Text>
                      <View style={styles.userContactRow}>
                        <Ionicons name="call-outline" size={12} color="#999" />
                        <Text style={styles.userContact} numberOfLines={1}>
                          {deposit.user_phone || deposit.user_email || 'No contact'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Amount</Text>
                    <Text style={styles.amount}>{formatAmount(deposit.amount)}</Text>
                  </View>
                </View>

                {/* Details Section */}
                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={16} color="#666" />
                    <Text style={styles.detailLabel}>Invoice:</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {deposit.invoice_number}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.detailLabel}>Submitted:</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(deposit.created_at)}
                    </Text>
                  </View>

                  {deposit.narration && (
                    <View style={styles.narrationContainer}>
                      <Ionicons name="chatbubble-outline" size={16} color="#666" />
                      <Text style={styles.narrationLabel}>Narration:</Text>
                      <Text style={styles.narrationText} numberOfLines={expandedCard === deposit.id ? undefined : 2}>
                        {deposit.narration}
                      </Text>
                    </View>
                  )}

                  {/* Proof Section */}
                  <View style={styles.proofSection}>
                    {renderProofImage(deposit.proof_image)}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(deposit)}
                    disabled={processing === deposit.id}
                  >
                    {processing === deposit.id ? (
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
                    onPress={() => handleApprove(deposit.id)}
                    disabled={processing === deposit.id}
                  >
                    {processing === deposit.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.approveButtonText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Expand/Collapse Button - Now properly positioned */}
                {deposit.narration && deposit.narration.length > 50 && (
                  <TouchableOpacity 
                    style={styles.expandButton}
                    onPress={() => setExpandedCard(expandedCard === deposit.id ? null : deposit.id)}
                  >
                    <Text style={styles.expandButtonText}>
                      {expandedCard === deposit.id ? 'Show Less' : 'Show More'}
                    </Text>
                    <Ionicons 
                      name={expandedCard === deposit.id ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#0A6BFF" 
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={rejectModalVisible}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="alert-circle" size={40} color="#FF3B30" />
              </View>
              <Text style={styles.modalTitle}>Reject Deposit</Text>
              <Text style={styles.modalSubtitle}>
                Please provide a reason for rejection
              </Text>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.reasonInputContainer}>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Enter rejection reason..."
                  placeholderTextColor="#999"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => {
                    setRejectModalVisible(false);
                    setRejectReason('');
                    setSelectedDeposit(null);
                  }}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmModalButton]}
                  onPress={confirmReject}
                >
                  <Text style={styles.confirmModalButtonText}>Confirm Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <ConfirmationModal
        visible={open}
        title={modalMessages.title}
        message={modalMessages.message}
        variant={modalMessages.variant}
        onCancel={() => {
          setOpen(false);
          modalMessages.onCancel();
        }}
        onConfirm={() => {
          setOpen(false);
          modalMessages.onclick();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
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
    paddingBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
  depositCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  depositCardExpanded: {
    shadowOpacity: 0.12,
    elevation: 5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9800',
  },
  statusText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '600',
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
  detailsSection: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  narrationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    gap: 6,
  },
  narrationLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  narrationText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  proofSection: {
    marginTop: 4,
  },
  proofImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#d1e7ff',
  },
  proofText: {
    fontSize: 13,
    color: '#0A6BFF',
    fontWeight: '500',
    flex: 1,
  },
  noProof: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    gap: 8,
  },
  noProofText: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  approveButton: {
    backgroundColor: '#3465c7',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    marginTop: 8,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  expandButtonText: {
    fontSize: 12,
    color: '#0A6BFF',
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: width - 40,
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  reasonInputContainer: {
    marginBottom: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmModalButton: {
    backgroundColor: '#FF3B30',
  },
  cancelModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  confirmModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});