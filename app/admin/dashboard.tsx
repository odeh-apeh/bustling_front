// app/(admin)/dashboard.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from '@/helpers/core-service';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

// Your backend API URL
const API_URL = `${BASE_URL}`; // Change to your server IP

// Stat Card Component
const StatCard = ({ title, value, icon, color, onPress, loading }: any) => (
  <TouchableOpacity 
    style={[styles.statCard, isSmallDevice && styles.statCardSmall]} 
    onPress={onPress}
    activeOpacity={0.7}
    disabled={loading}
  >
    <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={isSmallDevice ? 20 : 24} color={color} />
    </View>
    <View style={styles.statContent}>
      <Text style={[styles.statValue, isSmallDevice && styles.statValueSmall]}>
        {loading ? '...' : typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={[styles.statTitle, isSmallDevice && styles.statTitleSmall]}>{title}</Text>
    </View>
    {onPress && (
      <Ionicons name="chevron-forward" size={isSmallDevice ? 14 : 16} color="#999" style={styles.statArrow} />
    )}
  </TouchableOpacity>
);

// Recent Transaction Item
const TransactionItem = ({ transaction }: any) => (
  <View style={[styles.transactionItem, isSmallDevice && styles.transactionItemSmall]}>
    <View style={[
      styles.transactionIcon,
      isSmallDevice && styles.transactionIconSmall,
      { backgroundColor: transaction.type === 'credit' ? '#34C75920' : '#FF3B3020' }
    ]}>
      <Ionicons 
        name={transaction.type === 'credit' ? 'arrow-down' : 'arrow-up'} 
        size={isSmallDevice ? 16 : 18} 
        color={transaction.type === 'credit' ? '#34C759' : '#FF3B30'} 
      />
    </View>
    <View style={[styles.transactionInfo, isSmallDevice && styles.transactionInfoSmall]}>
      <Text style={[styles.transactionUser, isSmallDevice && styles.transactionUserSmall]} numberOfLines={1}>
        {transaction.user_name || 'User'}
      </Text>
      <Text style={[styles.transactionDesc, isSmallDevice && styles.transactionDescSmall]} numberOfLines={1}>
        {transaction.description || 'Transaction'}
      </Text>
    </View>
    <View style={styles.transactionAmount}>
      <Text style={[
        styles.transactionValue,
        isSmallDevice && styles.transactionValueSmall,
        { color: transaction.type === 'credit' ? '#34C759' : '#FF3B30' }
      ]}>
        ₦{parseFloat(transaction.amount || 0).toLocaleString()}
      </Text>
      <Text style={[styles.transactionTime, isSmallDevice && styles.transactionTimeSmall]}>
        {new Date(transaction.created_at).toLocaleDateString()}
      </Text>
    </View>
  </View>
);

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    loadAdminUser();
    fetchDashboardData();
  }, []);

  const loadAdminUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('adminUser');
      if (userData) {
        setAdminUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading admin user:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Dashboard data:', data);
        
        setStats(data.stats);
        setRecentTransactions(data.recentTransactions || []);
      } else if (response.status === 403) {
        // Not authenticated, redirect to login
        router.replace('/auth/account-support');
      } else {
        Alert.alert('Error', 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            // Call backend logout if needed
            try {
              await fetch(`${API_URL}/api/admin/logout`, { method: 'POST' });
            } catch (error) {
              console.error('Logout error:', error);
            }
            
            await AsyncStorage.removeItem('adminUser');
            await AsyncStorage.removeItem('adminToken');
            router.replace('/auth/account-support');
          }
        }
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount?.toLocaleString() || '0'}`;
  };

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A6BFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{ 
          title: 'Admin Dashboard',
          headerStyle: {
            backgroundColor: '#0A6BFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: isSmallDevice ? 16 : 18,
          },
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={isSmallDevice ? 20 : 22} color="#fff" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, isSmallDevice && styles.scrollContentSmall]}
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
        {/* Welcome Header */}
        <View style={[styles.welcomeHeader, isSmallDevice && styles.welcomeHeaderSmall]}>
          <View style={[styles.adminInfo, isSmallDevice && styles.adminInfoSmall]}>
            <View style={[styles.adminAvatar, isSmallDevice && styles.adminAvatarSmall]}>
              <Ionicons name="person-circle" size={isSmallDevice ? 40 : 50} color="#fff" />
            </View>
            <View style={[styles.adminDetails, isSmallDevice && styles.adminDetailsSmall]}>
              <Text style={[styles.welcomeText, isSmallDevice && styles.welcomeTextSmall]}>Welcome back,</Text>
              <Text style={[styles.adminName, isSmallDevice && styles.adminNameSmall]} numberOfLines={1}>
                {adminUser?.name || 'Administrator'}
              </Text>
              <Text style={[styles.adminRole, isSmallDevice && styles.adminRoleSmall]} numberOfLines={1}>
                {adminUser?.role || 'System Admin'}
              </Text>
            </View>
          </View>
          <View style={[styles.dateContainer, isSmallDevice && styles.dateContainerSmall]}>
            <Text style={[styles.dateText, isSmallDevice && styles.dateTextSmall]}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
        </View>

        {/* Stats Overview */}
        <View style={[styles.section, isSmallDevice && styles.sectionSmall]}>
          <View style={[styles.sectionHeader, isSmallDevice && styles.sectionHeaderSmall]}>
            <Text style={[styles.sectionTitle, isSmallDevice && styles.sectionTitleSmall]}>Platform Overview</Text>
            <TouchableOpacity onPress={fetchDashboardData}>
              <Ionicons name="refresh" size={isSmallDevice ? 18 : 20} color="#0A6BFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Users"
              value={stats?.totalUsers || 0}
              icon="people"
              color="#4A90E2"
              onPress={() => router.push('/admin/users')}
              loading={loading}
            />
            <StatCard
              title="Total Products"
              value={stats?.totalProducts || 0}
              icon="cube"
              color="#34C759"
              onPress={() => router.push('/admin/products')}
              loading={loading}
            />
            <StatCard
              title="Total Orders"
              value={stats?.totalOrders || 0}
              icon="cart"
              color="#FF9500"
              onPress={() => router.push('/admin/orders')}
              loading={loading}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats?.totalRevenue || 0)}
              icon="cash"
              color="#FF3B30"
              loading={loading}
            />
            <StatCard
              title="Pending Escrows"
              value={stats?.pendingEscrows || 0}
              icon="shield-checkmark"
              color="#5856D6"
              onPress={() => router.push('/admin/escrows')}
              loading={loading}
            />
            <StatCard
              title="Active Disputes"
              value={stats?.pendingDisputes || 0}
              icon="warning"
              color="#FF9500"
              onPress={() => router.push('/admin/disputes')}
              loading={loading}
            />

            <StatCard
    title="Pending Deposits"
    value={stats?.pendingDeposits || 0}
    icon="cash-outline"
    color="#34C759"
    onPress={() => router.push('/admin/pending-deposits' as any)}
    loading={loading}
  />
  
  <StatCard
    title="Pending Withdrawals"
    value={stats?.pendingWithdrawals || 0}
    icon="card-outline"
    color="#FF9500"
    onPress={() => router.push('/admin/pending-withdrawals' as any)}
    loading={loading}
  />
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={[styles.section, isSmallDevice && styles.sectionSmall]}>
          <View style={[styles.sectionHeader, isSmallDevice && styles.sectionHeaderSmall]}>
            <Text style={[styles.sectionTitle, isSmallDevice && styles.sectionTitleSmall]}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/admin/transactions')}>
              <Text style={[styles.seeAllText, isSmallDevice && styles.seeAllTextSmall]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.transactionsContainer, isSmallDevice && styles.transactionsContainerSmall]}>
            {recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 5).map((transaction, index) => (
                <TransactionItem key={transaction.id || index} transaction={transaction} />
              ))
            ) : (
              <View style={[styles.emptyTransactions, isSmallDevice && styles.emptyTransactionsSmall]}>
                <Ionicons name="receipt-outline" size={isSmallDevice ? 30 : 40} color="#ccc" />
                <Text style={[styles.emptyText, isSmallDevice && styles.emptyTextSmall]}>No recent transactions</Text>
              </View>
            )}
          </View>
        </View>

        {/* Platform Status */}
        <View style={[styles.section, isSmallDevice && styles.sectionSmall]}>
          <View style={[styles.sectionHeader, isSmallDevice && styles.sectionHeaderSmall]}>
            <Text style={[styles.sectionTitle, isSmallDevice && styles.sectionTitleSmall]}>System Status</Text>
          </View>
          
          <View style={[styles.statusContainer, isSmallDevice && styles.statusContainerSmall]}>
            <View style={[styles.statusItem, isSmallDevice && styles.statusItemSmall]}>
              <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
              <Text style={[styles.statusText, isSmallDevice && styles.statusTextSmall]}>Platform: Operational</Text>
            </View>
            <View style={[styles.statusItem, isSmallDevice && styles.statusItemSmall]}>
              <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
              <Text style={[styles.statusText, isSmallDevice && styles.statusTextSmall]}>Database: Connected</Text>
            </View>
            <View style={[styles.statusItem, isSmallDevice && styles.statusItemSmall]}>
              <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
              <Text style={[styles.statusText, isSmallDevice && styles.statusTextSmall]}>API: Online</Text>
            </View>
          </View>
        </View>

        {/* Footer Spacing */}
        <View style={[styles.footerSpacing, isSmallDevice && styles.footerSpacingSmall]} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  scrollContentSmall: {
    paddingBottom: 20,
  },
  logoutButton: {
    padding: 8,
    marginRight: 10,
  },
  
  // Welcome Header
  welcomeHeader: {
    backgroundColor: '#0A6BFF',
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 20,
  },
  welcomeHeaderSmall: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 25,
    marginBottom: 16,
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  adminInfoSmall: {
    marginBottom: 12,
  },
  adminAvatar: {
    marginRight: 15,
  },
  adminAvatarSmall: {
    marginRight: 12,
  },
  adminDetails: {
    flex: 1,
  },
  adminDetailsSmall: {
    flex: 1,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 2,
  },
  welcomeTextSmall: {
    fontSize: 12,
  },
  adminName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  adminNameSmall: {
    fontSize: 18,
  },
  adminRole: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  adminRoleSmall: {
    fontSize: 11,
  },
  dateContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  dateContainerSmall: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  dateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  dateTextSmall: {
    fontSize: 11,
  },
  
  // Section
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionSmall: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionHeaderSmall: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  sectionTitleSmall: {
    fontSize: 16,
  },
  seeAllText: {
    color: '#0A6BFF',
    fontSize: 14,
    fontWeight: '500',
  },
  seeAllTextSmall: {
    fontSize: 13,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: width < 375 ? '48%' : width < 400 ? '48%' : width * 0.31,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statCardSmall: {
    width: width < 340 ? '48%' : '48%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  statValueSmall: {
    fontSize: 18,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
  },
  statTitleSmall: {
    fontSize: 11,
  },
  statArrow: {
    marginLeft: 8,
  },
  
  // Transactions
  transactionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  transactionsContainerSmall: {
    borderRadius: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  transactionItemSmall: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 10,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionInfoSmall: {
    flex: 1,
  },
  transactionUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  transactionUserSmall: {
    fontSize: 13,
  },
  transactionDesc: {
    fontSize: 12,
    color: '#666',
  },
  transactionDescSmall: {
    fontSize: 11,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  transactionValueSmall: {
    fontSize: 14,
  },
  transactionTime: {
    fontSize: 11,
    color: '#999',
  },
  transactionTimeSmall: {
    fontSize: 10,
  },
  emptyTransactions: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTransactionsSmall: {
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  emptyTextSmall: {
    fontSize: 13,
  },
  
  // Status
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statusContainerSmall: {
    borderRadius: 12,
    padding: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusItemSmall: {
    marginBottom: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statusTextSmall: {
    fontSize: 13,
  },
  
  // Footer
  footerSpacing: {
    height: 20,
  },
  footerSpacingSmall: {
    height: 15,
  },
});