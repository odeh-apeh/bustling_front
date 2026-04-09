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
  StatusBar,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL, CoreService } from '@/helpers/core-service';
import { useToast } from '@/contexts/toast-content';
import { TicketType } from '../support/CustomerServiceScreen';
import AdminTicketsScreen from './issues';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

const API_URL = `${BASE_URL}`;

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ title, value, icon, color, onPress, loading }: any) => (
  <TouchableOpacity
    style={styles.statCard}
    onPress={onPress}
    activeOpacity={0.75}
    disabled={loading}
  >
    {/* Colored top accent line */}
    <View style={[styles.statAccent, { backgroundColor: color }]} />

    <View style={styles.statInner}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={isSmallDevice ? 18 : 20} color={color} />
      </View>

      <Text style={styles.statValue}>
        {loading ? '–' : typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={styles.statTitle} numberOfLines={1}>{title}</Text>
    </View>

    {onPress && (
      <View style={[styles.statArrowWrap, { backgroundColor: color + '12' }]}>
        <Ionicons name="arrow-forward" size={12} color={color} />
      </View>
    )}
  </TouchableOpacity>
);

// ─── Transaction Item ─────────────────────────────────────────────────────────

const TransactionItem = ({ transaction, isLast }: any) => {
  const isCredit = transaction.type === 'credit';
  return (
    <View style={[styles.txItem, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.txIcon, { backgroundColor: isCredit ? '#00C48C18' : '#FF647218' }]}>
        <Ionicons
          name={isCredit ? 'arrow-down' : 'arrow-up'}
          size={16}
          color={isCredit ? '#00C48C' : '#FF6472'}
        />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txUser} numberOfLines={1}>{transaction.user_name || 'User'}</Text>
        <Text style={styles.txDesc} numberOfLines={1}>{transaction.description || 'Transaction'}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isCredit ? '#00C48C' : '#FF6472' }]}>
          {isCredit ? '+' : '-'}₦{parseFloat(transaction.amount || 0).toLocaleString()}
        </Text>
        <Text style={styles.txDate}>{new Date(transaction.created_at).toLocaleDateString()}</Text>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const service: CoreService = new CoreService();
  const [isViewingTickets, setViewingTickets] = useState<boolean>(false);

  const { showToast } = useToast();

  const fetchTickets = async () => {
    try {
      const res = await service.get<TicketType[]>('/api/admin/tickets/all');
      if (res.success && res.data) {
        setTickets(res.data);
        console.log(res.data)
        showToast(res.message);
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast('Failed to load support tickets ' + (e as Error).message, 'error');
    }
  };

  useEffect(() => {
    loadAdminUser();
    fetchDashboardData();
    fetchTickets();
  }, []);

  const loadAdminUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('adminUser');
      if (userData) setAdminUser(JSON.parse(userData));
    } catch (error) {
      console.error('Error loading admin user:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentTransactions(data.recentTransactions || []);
      } else if (response.status === 403) {
        router.replace('/auth/account-support');
      } else {
        showToast('Failed to load dashboard data', 'error');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showToast('Network error. Please check your connection.', 'error');
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
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/admin/logout`, { method: 'POST' });
          } catch (error) {
            console.error('Logout error:', error);
          }
          await AsyncStorage.removeItem('adminUser');
          await AsyncStorage.removeItem('adminToken');
          router.replace('/auth/account-support');
        },
      },
    ]);
  };

  const formatCurrency = (amount: number) => `₦${amount?.toLocaleString() || '0'}`;

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3986f9" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (isViewingTickets) {
    return <AdminTicketsScreen onBack={() => setViewingTickets(false)} />;
  }

  const openCount = tickets.filter(t => t.status.toLowerCase() === 'open').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#3986f9" />
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3986f9']} tintColor="#3986f9" />
        }
      >
        {/* ── Hero Header ── */}
        <View style={styles.hero}>
          {/* Decorative circles */}
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />

          <View style={styles.heroTop}>
            <View style={styles.heroAvatar}>
              <Ionicons name="person" size={26} color="#3986f9" />
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.heroGreeting}>Welcome back</Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {adminUser?.name || 'Administrator'}
              </Text>
              <View style={styles.roleChip}>
                <View style={styles.roleChipDot} />
                <Text style={styles.roleChipText}>{adminUser?.role || 'System Admin'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.refreshBtn}>
              <Ionicons name="log-out" size={18} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroDateRow}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroDate}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* ── Quick Status Strip ── */}
        <View style={styles.statusStrip}>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: '#00C48C' }]} />
            <Text style={styles.statusPillText}>Platform</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: '#00C48C' }]} />
            <Text style={styles.statusPillText}>Database</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: '#00C48C' }]} />
            <Text style={styles.statusPillText}>API</Text>
          </View>
          <View style={styles.statusAllGood}>
            <Text style={styles.statusAllGoodText}>All systems go</Text>
          </View>
        </View>

        {/* ── Stats Grid ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>OVERVIEW</Text>
            <Text style={styles.sectionTitle}>Platform Stats</Text>
          </View>

          <View style={styles.statsGrid}>
            <StatCard title="Total Users" value={stats?.totalUsers || 0} icon="people" color="#3986f9" onPress={() => router.push('/admin/users')} loading={loading} />
            <StatCard title="Total Products" value={stats?.totalProducts || 0} icon="cube" color="#00C48C" onPress={() => router.push('/admin/products')} loading={loading} />
            <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon="cart" color="#FF9F43" onPress={() => router.push('/admin/orders')} loading={loading} />
            <StatCard title="Revenue" value={formatCurrency(stats?.totalRevenue || 0)} icon="cash" color="#FF6472" loading={loading} />
            <StatCard title="Pending Escrows" value={stats?.pendingEscrows || 0} icon="shield-checkmark" color="#A78BFA" onPress={() => router.push('/admin/escrows')} loading={loading} />
            <StatCard title="Active Disputes" value={stats?.pendingDisputes || 0} icon="warning" color="#FF9F43" onPress={() => router.push('/admin/disputes')} loading={loading} />
            <StatCard title="Deposits" value={stats?.pendingDeposits || 0} icon="cash-outline" color="#00C48C" onPress={() => router.push('/admin/pending-deposits' as any)} loading={loading} />
            <StatCard title="Withdrawals" value={stats?.pendingWithdrawals || 0} icon="card-outline" color="#FF6472" onPress={() => router.push('/admin/pending-withdrawals' as any)} loading={loading} />
            <StatCard title="Profile" value="" icon="person" color="#1565C0" onPress={() => router.push('/admin/AdminProfileScreen' as any)} loading={loading} />
          </View>
        </View>

        {/* ── Recent Transactions ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>ACTIVITY</Text>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
            </View>
            {/* <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/admin/transactions')}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="arrow-forward" size={13} color="#3986f9" />
            </TouchableOpacity> */}
          </View>

          <View style={styles.txCard}>
            {recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 5).map((tx, i) => (
                <TransactionItem
                  key={tx.id || i}
                  transaction={tx}
                  isLast={i === Math.min(recentTransactions.length, 5) - 1}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="receipt-outline" size={28} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>No transactions yet</Text>
                <Text style={styles.emptySubtitle}>Recent activity will appear here</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Floating Tickets FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setViewingTickets(true)}
        activeOpacity={0.85}
      >
        {openCount > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{openCount > 99 ? '99+' : openCount}</Text>
          </View>
        )}
        <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_WIDTH = (width - 48 - 12) / 2;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f1f5f9' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '500' },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  logoutButton: { padding: 8, marginRight: 8 },

  // ── Hero ──
  hero: {
    backgroundColor: '#3986f9',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  heroCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -40,
  },
  heroCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: 10,
    left: -20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  heroMeta: { flex: 1 },
  heroGreeting: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500', marginBottom: 2 },
  heroName: { color: '#fff', fontSize: isSmallDevice ? 17 : 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: 6 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleChipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7effc4' },
  roleChipText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 14 },
  heroDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroDate: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500' },

  // ── Status Strip ──
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  statusAllGood: {
    marginLeft: 'auto',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusAllGoodText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },

  // ── Sections ──
  section: { paddingHorizontal: 16, marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.2, marginBottom: 2 },
  sectionTitle: { fontSize: isSmallDevice ? 16 : 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontSize: 13, fontWeight: '600', color: '#3986f9' },

  // ── Stats Grid ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  statAccent: { height: 3, width: '100%' },
  statInner: { padding: 14 },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: isSmallDevice ? 20 : 22, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5, marginBottom: 3 },
  statTitle: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  statArrowWrap: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Transactions ──
  txCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: { flex: 1 },
  txUser: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  txDesc: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  txDate: { fontSize: 11, color: '#cbd5e1', fontWeight: '500' },

  emptyState: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#475569' },
  emptySubtitle: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#3986f9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3986f9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6472',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  fabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});