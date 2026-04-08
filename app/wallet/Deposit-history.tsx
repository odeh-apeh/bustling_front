import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '@/helpers/core-service';

interface Deposit {
  id: number;
  invoice_number: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  proof_image: any;
  narration: string | null;
  admin_notes: string | null;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

const API_URL = `${BASE_URL}`;

export default function DepositHistoryScreen() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const fetchDepositHistory = async () => {
    try {
      const url = filter === 'all' 
        ? `${API_URL}/api/wallet/deposits?limit=100`
        : `${API_URL}/api/wallet/deposits?status=${filter}&limit=100`;
      
      const response = await fetch(url, {
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.success) {
        setDeposits(data.deposits || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to load deposit history');
      }
    } catch (error) {
      console.error('Error fetching deposit history:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepositHistory();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDepositHistory();
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
        return '#8E8E93';
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

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
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

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const navigateToNewDeposit = () => {
    router.push('/wallet/DepositScreen' as any);
  };

  const renderFilterButtons = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      {[
        { key: 'all', label: 'All' },
        { key: 'pending', label: 'Pending' },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Rejected' },
      ].map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.filterButton,
            filter === item.key && styles.filterButtonActive,
          ]}
          onPress={() => setFilter(item.key as any)}
        >
          <Text style={[
            styles.filterButtonText,
            filter === item.key && styles.filterButtonTextActive,
          ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderDepositCard = (deposit: Deposit) => {
    const statusColor = getStatusColor(deposit.status);
    const statusIcon = getStatusIcon(deposit.status);
    
    return (
      <TouchableOpacity 
        key={deposit.id}
        style={styles.depositCard}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.invoiceContainer}>
            <Ionicons name="document-text" size={16} color="#666" />
            <Text style={styles.invoiceText} numberOfLines={1}>
              {deposit.invoice_number}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons 
              name={statusIcon as any} 
              size={12} 
              color={statusColor} 
              style={styles.statusIcon}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(deposit.status)}
            </Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>₦{parseFloat(deposit.amount).toLocaleString()}</Text>
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.dateText}>{formatDate(deposit.created_at)}</Text>
          </View>
          <Text style={styles.timeAgoText}>{formatShortDate(deposit.created_at)}</Text>
        </View>

        {deposit.narration && (
          <View style={styles.narrationContainer}>
            <Text style={styles.narrationLabel}>Narration:</Text>
            <Text style={styles.narrationText}>{deposit.narration}</Text>
          </View>
        )}

        {deposit.admin_notes && deposit.status !== 'pending' && (
          <View style={[
            styles.adminNotesContainer,
            { backgroundColor: deposit.status === 'approved' ? '#E8F5E9' : '#FFEBEE' }
          ]}>
            <Ionicons 
              name="information-circle" 
              size={14} 
              color={deposit.status === 'approved' ? '#2E7D32' : '#C62828'} 
            />
            <Text style={[
              styles.adminNotesText,
              { color: deposit.status === 'approved' ? '#2E7D32' : '#C62828' }
            ]}>
              {deposit.admin_notes}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && deposits.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0A6BFF" />
        <Text style={styles.loadingText}>Loading deposit history...</Text>
      </View>
    );
  }

  const filteredCount = deposits.length;
  const pendingCount = deposits.filter(d => d.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deposit History</Text>
        <TouchableOpacity 
          style={styles.newDepositButton}
          onPress={navigateToNewDeposit}
        >
          <Ionicons name="add-circle" size={22} color="#0A6BFF" />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{deposits.length}</Text>
          <Text style={styles.summaryLabel}>Total Deposits</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            ₦{deposits
              .filter(d => d.status === 'approved')
              .reduce((sum, d) => sum + parseFloat(d.amount), 0)
              .toLocaleString()}
          </Text>
          <Text style={styles.summaryLabel}>Total Approved</Text>
        </View>
      </View>

      {/* Filter Buttons */}
      {renderFilterButtons()}

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
            <Ionicons 
              name={filter === 'all' ? "cash-outline" : "filter"} 
              size={60} 
              color="#ccc" 
            />
            <Text style={styles.emptyTitle}>
              {filter === 'all' ? 'No Deposit History' : `No ${filter} Deposits`}
            </Text>
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? "You haven't made any deposits yet"
                : `You don't have any ${filter} deposits`
              }
            </Text>
            {filter === 'all' && (
              <TouchableOpacity 
                style={styles.newDepositActionButton}
                onPress={navigateToNewDeposit}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.newDepositActionText}>Make First Deposit</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.resultCount}>
              Showing {filteredCount} deposit{filteredCount !== 1 ? 's' : ''}
              {filter !== 'all' && ` (${filter})`}
            </Text>
            
            {deposits.map(renderDepositCard)}
            
            <View style={styles.bottomSpacing} />
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {deposits.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={navigateToNewDeposit}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
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
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  newDepositButton: {
    padding: 6,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0A6BFF',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  filterContainer: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  filterContent: {
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    marginRight: 8,
    height:35
  },
  filterButtonActive: {
    backgroundColor: '#0A6BFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  scrollView: {
    
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  resultCount: {
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
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  invoiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  timeAgoText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
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
  adminNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  adminNotesText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
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
    marginBottom: 24,
  },
  newDepositActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A6BFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  newDepositActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A6BFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});