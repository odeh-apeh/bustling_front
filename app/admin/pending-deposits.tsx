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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Add this
import { BASE_URL } from '@/helpers/core-service';

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

  const fetchPendingDeposits = async () => {
    try {
      // Get token from AsyncStorage (same as Users screen)
      const token = await AsyncStorage.getItem('adminToken');
      
      if (!token) {
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'OK', onPress: () => router.replace('/auth/account-support') }
        ]);
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/pending-deposit`, {
        headers: {
          'Authorization': `Bearer ${token}`, // Use Bearer token
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDeposits(data.deposits || []);
      } else if (response.status === 401 || response.status === 403) {
        // Token expired or not admin
        await AsyncStorage.removeItem('adminToken'); // Clear invalid token
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'OK', onPress: () => router.replace('/auth/account-support') }
        ]);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to load pending deposits');
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
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
    Alert.alert(
      'Approve Deposit',
      'Are you sure you want to approve this deposit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            await processDeposit(depositId, 'approve');
          }
        }
      ]
    );
  };

  const handleReject = async (depositId: number) => {
    Alert.prompt(
      'Reject Deposit',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason: any) => {
            await processDeposit(depositId, 'reject', reason);
          }
        }
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const processDeposit = async (depositId: number, action: 'approve' | 'reject', notes?: string) => {
    setProcessing(depositId);
    
    try {
      const token = await AsyncStorage.getItem('adminToken');
      
      if (!token) {
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'OK', onPress: () => router.replace('/auth/account-support') }
        ]);
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/approve-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Use Bearer token
        },
        body: JSON.stringify({
          deposit_id: depositId,
          action: action,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', data.message || `Deposit ${action}d successfully`);
        // Remove from list
        setDeposits(prev => prev.filter(deposit => deposit.id !== depositId));
      } else if (response.status === 401 || response.status === 403) {
        await AsyncStorage.removeItem('adminToken'); // Clear invalid token
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'OK', onPress: () => router.replace('/auth/account-support') }
        ]);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || `Failed to ${action} deposit`);
      }
    } catch (error) {
      console.error('Error processing deposit:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  // ... rest of the component remains the same

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
            <View style={styles.proofImage}>
              <Ionicons name="image" size={24} color="#007AFF" />
              <Text style={styles.proofText}>View Proof</Text>
            </View>
          </TouchableOpacity>
        );
      }
    } catch (e) {
      console.log('Error parsing proof image:', e);
    }
    
    return (
      <View style={styles.noProof}>
        <Text style={styles.noProofText}>No proof uploaded</Text>
      </View>
    );
  };

  if (loading && deposits.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A6BFF" />
        <Text style={styles.loadingText}>Loading deposits...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Pending Deposits',
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
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
            <Ionicons name="checkmark-circle-outline" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No Pending Deposits</Text>
            <Text style={styles.emptyText}>
              All deposits have been processed
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.totalText}>
              {deposits.length} pending deposit{deposits.length !== 1 ? 's' : ''}
            </Text>
            
            {deposits.map((deposit) => (
              <View key={deposit.id} style={styles.depositCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.avatarText}>
                        {deposit.user_name?.charAt(0) || 'U'}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {deposit.user_name || 'Unknown User'}
                      </Text>
                      <Text style={styles.userContact} numberOfLines={1}>
                        {deposit.user_phone || deposit.user_email || 'No contact'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amount}>₦{parseFloat(deposit.amount).toLocaleString()}</Text>
                  </View>
                </View>

                {/* Invoice & Date */}
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="document-text" size={14} color="#666" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {deposit.invoice_number}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={14} color="#666" />
                    <Text style={styles.infoText}>
                      {formatDate(deposit.created_at)}
                    </Text>
                  </View>
                </View>

                {/* Narration */}
                {deposit.narration && (
                  <View style={styles.narrationContainer}>
                    <Text style={styles.narrationLabel}>Narration:</Text>
                    <Text style={styles.narrationText}>{deposit.narration}</Text>
                  </View>
                )}

                {/* Proof Image */}
                {renderProofImage(deposit.proof_image)}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(deposit.id)}
                    disabled={processing === deposit.id}
                  >
                    {processing === deposit.id ? (
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
                    onPress={() => handleApprove(deposit.id)}
                    disabled={processing === deposit.id}
                  >
                    {processing === deposit.id ? (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
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
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  narrationContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  narrationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  narrationText: {
    fontSize: 14,
    color: '#333',
  },
  proofImageContainer: {
    marginBottom: 16,
  },
  proofImage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1e7ff',
    borderStyle: 'dashed',
  },
  proofText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  noProof: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  noProofText: {
    fontSize: 12,
    color: '#999',
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
    height: 20,
  },
});