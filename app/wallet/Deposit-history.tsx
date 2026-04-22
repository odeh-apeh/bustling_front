import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '@/helpers/core-service';

const { width } = Dimensions.get('window');

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
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;

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

  const handleFabPressIn = () => {
    Animated.spring(fabScale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

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
        { key: 'all', label: 'All', icon: 'apps-outline' },
        { key: 'pending', label: 'Pending', icon: 'time-outline' },
        { key: 'approved', label: 'Approved', icon: 'checkmark-circle-outline' },
        { key: 'rejected', label: 'Rejected', icon: 'close-circle-outline' },
      ].map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.filterButton,
            filter === item.key && styles.filterButtonActive,
          ]}
          onPress={() => setFilter(item.key as any)}
        >
          <Ionicons 
            name={item.icon as any} 
            size={14} 
            color={filter === item.key ? '#fff' : '#8E8E93'} 
            style={styles.filterIcon}
          />
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
      <Animated.View 
        key={deposit.id}
        style={[
          styles.depositCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.invoiceContainer}>
            <View style={styles.invoiceIcon}>
              <Ionicons name="document-text-outline" size={16} color="#185FA5" />
            </View>
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
            <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
            <Text style={styles.dateText}>{formatDate(deposit.created_at)}</Text>
          </View>
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={12} color="#8E8E93" />
            <Text style={styles.timeAgoText}>{formatShortDate(deposit.created_at)}</Text>
          </View>
        </View>

        {deposit.narration && (
          <View style={styles.narrationContainer}>
            <Ionicons name="chatbubble-outline" size={14} color="#8E8E93" />
            <Text style={styles.narrationText}>{deposit.narration}</Text>
          </View>
        )}

        {deposit.admin_notes && deposit.status !== 'pending' && (
          <View style={[
            styles.adminNotesContainer,
            { backgroundColor: deposit.status === 'approved' ? '#E8F5E9' : '#FFEBEE' }
          ]}>
            <Ionicons 
              name="information-circle-outline" 
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
      </Animated.View>
    );
  };

  if (loading && deposits.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#185FA5" />
          <Text style={styles.loadingText}>Loading deposit history...</Text>
        </View>
      </View>
    );
  }

  const filteredCount = deposits.length;
  const pendingCount = deposits.filter(d => d.status === 'pending').length;
  const approvedTotal = deposits
    .filter(d => d.status === 'approved')
    .reduce((sum, d) => sum + parseFloat(d.amount), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header with Gradient */}
      <LinearGradient
        colors={['#185FA5', '#0F4A7A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitleWhite}>Deposit History</Text>
          <TouchableOpacity 
            style={styles.newDepositButton}
            onPress={navigateToNewDeposit}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Summary Stats */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="cash-outline" size={20} color="#185FA5" />
          </View>
          <Text style={styles.summaryValue}>{deposits.length}</Text>
          <Text style={styles.summaryLabel}>Total Deposits</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="time-outline" size={20} color="#FF9500" />
          </View>
          <Text style={styles.summaryValue}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#34C759" />
          </View>
          <Text style={styles.summaryValue}>₦{approvedTotal.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Approved Total</Text>
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
            colors={['#185FA5']}
            tintColor="#185FA5"
          />
        }
      >
        {deposits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons 
                name={filter === 'all' ? "cash-outline" : "filter-outline"} 
                size={60} 
                color="#C7C7CC" 
              />
            </View>
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
                <LinearGradient
                  colors={['#185FA5', '#0F4A7A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.newDepositActionText}>Make First Deposit</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.resultCount}>
                Showing {filteredCount} deposit{filteredCount !== 1 ? 's' : ''}
                {filter !== 'all' && ` (${filter})`}
              </Text>
              <TouchableOpacity onPress={onRefresh}>
                <Ionicons name="refresh-outline" size={18} color="#185FA5" />
              </TouchableOpacity>
            </View>
            
            {deposits.map(renderDepositCard)}
            
            <View style={styles.bottomSpacing} />
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {deposits.length > 0 && (
        <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
          <TouchableOpacity 
            style={styles.fab}
            onPress={navigateToNewDeposit}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#185FA5', '#0F4A7A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
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
  headerTitleWhite: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  newDepositButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 6,
    height:60
  },
  filterButtonActive: {
    backgroundColor: '#185FA5',
    borderColor: '#185FA5',
  },
  filterIcon: {
    marginRight: 2,
  },
  filterButtonText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  scrollView: {
    //flex: 1,
  },
  scrollContent: {
  paddingHorizontal: 16,
  paddingBottom: 80,
},
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  resultCount: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  depositCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  invoiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  invoiceIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  invoiceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
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
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  timeAgoText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  narrationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
  },
  narrationText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  adminNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  adminNotesText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  newDepositActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  newDepositActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});