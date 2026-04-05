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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '@/helpers/core-service';

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

  const fetchPendingWithdrawals = async () => {
    try {
      // REMOVE token - just fetch without authentication
      const response = await fetch(`${API_URL}/api/admin/pending-withdrawal`);
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Withdrawals data:', data);
        setWithdrawals(data.withdrawals || []);
      } else {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        Alert.alert('Error', `Failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      Alert.alert('Error', 'Network error');
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

  const handleApprove = async (withdrawalId: number) => {
    Alert.alert(
      'Approve Withdrawal',
      'Have you made the transfer to the user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Paid',
          style: 'default',
          onPress: async () => {
            Alert.prompt(
              'Transaction Reference',
              'Enter the transaction reference from your bank:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm',
                  style: 'default',
                  onPress: async (reference: any) => {
                    if (!reference || reference.trim() === '') {
                      Alert.alert('Error', 'Transaction reference is required');
                      return;
                    }
                    await processWithdrawal(withdrawalId, 'mark_paid', reference);
                  }
                }
              ],
              'plain-text',
              '',
              'default'
            );
          }
        },
        {
          text: 'Just Approve',
          style: 'destructive',
          onPress: async () => {
            await processWithdrawal(withdrawalId, 'approve');
          }
        }
      ]
    );
  };

  const handleReject = async (withdrawalId: number) => {
    Alert.prompt(
      'Reject Withdrawal',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason: any) => {
            await processWithdrawal(withdrawalId, 'reject', reason);
          }
        }
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const processWithdrawal = async (withdrawalId: number, action: 'approve' | 'reject' | 'mark_paid', notes?: string) => {
    setProcessing(withdrawalId);
    
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/approve-withdrawal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withdrawal_id: withdrawalId,
          action: action,
          transaction_reference: action === 'mark_paid' ? notes : undefined,
          notes: action !== 'mark_paid' ? notes : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', data.message || `Withdrawal ${action} successfully`);
        // Remove from list
        setWithdrawals(prev => prev.filter(w => w.id !== withdrawalId));
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || `Failed to ${action} withdrawal`);
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return `${accountNumber.slice(0, 4)}****${accountNumber.slice(-2)}`;
  };

  if (loading && withdrawals.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A6BFF" />
          <Text style={styles.loadingText}>Loading withdrawals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Pending Withdrawals',
          headerStyle: {
            backgroundColor: '#0A6BFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
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
          {withdrawals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={60} color="#ccc" />
              <Text style={styles.emptyTitle}>No Pending Withdrawals</Text>
              <Text style={styles.emptyText}>
                All withdrawals have been processed
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.totalText}>
                {withdrawals.length} pending withdrawal{withdrawals.length !== 1 ? 's' : ''}
              </Text>
              
              {withdrawals.map((withdrawal) => (
                <View key={withdrawal.id} style={styles.withdrawalCard}>
                  {/* Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.avatarText}>
                          {withdrawal.user_name?.charAt(0) || 'U'}
                        </Text>
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={styles.userName} numberOfLines={1}>
                          {withdrawal.user_name || 'Unknown User'}
                        </Text>
                        <Text style={styles.userContact} numberOfLines={1}>
                          {withdrawal.user_phone || withdrawal.user_email || 'No contact'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.amountContainer}>
                      <Text style={styles.amount}>₦{parseFloat(withdrawal.amount).toLocaleString()}</Text>
                    </View>
                  </View>

                  {/* Bank Details */}
                  <View style={styles.bankDetails}>
                    <View style={styles.bankRow}>
                      <View style={styles.bankIcon}>
                        <Ionicons name="business" size={14} color="#666" />
                      </View>
                      <View style={styles.bankInfo}>
                        <Text style={styles.bankLabel}>Bank</Text>
                        <Text style={styles.bankValue}>{withdrawal.bank_name}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.bankRow}>
                      <View style={styles.bankIcon}>
                        <Ionicons name="card" size={14} color="#666" />
                      </View>
                      <View style={styles.bankInfo}>
                        <Text style={styles.bankLabel}>Account Number</Text>
                        <Text style={styles.bankValue}>{withdrawal.account_number}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.bankRow}>
                      <View style={styles.bankIcon}>
                        <Ionicons name="person" size={14} color="#666" />
                      </View>
                      <View style={styles.bankInfo}>
                        <Text style={styles.bankLabel}>Account Name</Text>
                        <Text style={styles.bankValue}>{withdrawal.account_name}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Date */}
                  <View style={styles.dateContainer}>
                    <Ionicons name="time-outline" size={14} color="#666" />
                    <Text style={styles.dateText}>
                      Requested: {formatDate(withdrawal.created_at)}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleReject(withdrawal.id)}
                      disabled={processing === withdrawal.id}
                    >
                      {processing === withdrawal.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="close-circle" size={18} color="#fff" />
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApprove(withdrawal.id)}
                      disabled={processing === withdrawal.id}
                    >
                      {processing === withdrawal.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}
          
          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  backButton: {
    padding: 8,
    marginLeft: Platform.OS === 'ios' ? 0 : 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 100 : 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0A6BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userContact: {
    fontSize: 12,
    color: '#666',
  },
  amountContainer: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1e7ff',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A6BFF',
  },
  bankDetails: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bankIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  bankInfo: {
    flex: 1,
  },
  bankLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  bankValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
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
  bottomSpacing: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});