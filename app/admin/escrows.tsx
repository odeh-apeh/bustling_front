import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { SafeAreaView} from 'react-native-safe-area-context';
import { BASE_URL } from "@/helpers/core-service";


const API_BASE_URL = `${BASE_URL}/api/admin`;

interface Escrow {
  id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: "pending" | "released" | "disputed" | "refunded";
  created_at: string;
  released_at: string | null;
  buyer_name: string;
  seller_name: string;
  product_name?: string;
  order_id?: string;
}

export default function AdminEscrowsScreen() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    released: 0,
    disputed: 0,
    refunded: 0,
    total_amount: 0,
    pending_amount: 0,
  });

  // Fetch escrows
  const fetchEscrows = async () => {
  try {
    setLoading(true);
    const url = new URL(`${API_BASE_URL}/escrows`);
    if (filter !== "all") {
      url.searchParams.append("status", filter);
    }

    const response = await fetch(url.toString(), {
      credentials: 'include',
    });
    
    const data = await response.json();
    console.log('API Response:', data); // Debug log
    
    if (data.success) {
      setEscrows(data.escrows || []);
      setStats(data.stats || stats);
    } else {
      Alert.alert("Error", data.message || "Failed to load escrows");
    }
  } catch (error) {
    console.error('Error:', error);
    Alert.alert("Error", "Failed to load escrows");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  useEffect(() => {
    fetchEscrows();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEscrows();
  };

  // Handle escrow actions
  const handleEscrowAction = async (action: "release" | "refund") => {
    if (!selectedEscrow) return;

    setActionLoading(true);
    try {
      const endpoint = action === "release" ? "release-escrow" : "refund-escrow";
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          escrowId: selectedEscrow.id
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert("Success", `Escrow ${action}ed successfully`);
        setModalVisible(false);
        setSelectedEscrow(null);
        fetchEscrows();
      } else {
        Alert.alert("Error", data.message || `Failed to ${action} escrow`);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert("Error", `Failed to ${action} escrow`);
    } finally {
      setActionLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => `₦${amount?.toLocaleString() || "0"}`;

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'released': return '#10B981';
      case 'disputed': return '#EF4444';
      case 'refunded': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  // Escrow card - SIMPLE AND CLEAN
  const EscrowCard = ({ item }: { item: Escrow }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => {
        setSelectedEscrow(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          <Text style={styles.idText}>ID: {item.id.slice(-8)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Feather name="user" size={14} color="#6B7280" />
          <Text style={styles.label}>Buyer: </Text>
          <Text style={styles.value}>{item.buyer_name}</Text>
        </View>
        
        <View style={styles.row}>
          <Feather name="user" size={14} color="#6B7280" />
          <Text style={styles.label}>Seller: </Text>
          <Text style={styles.value}>{item.seller_name}</Text>
        </View>
        
        <View style={styles.row}>
          <Feather name="calendar" size={14} color="#6B7280" />
          <Text style={styles.label}>Date: </Text>
          <Text style={styles.value}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Stats card - SIMPLE
  const StatCard = ({ title, value, color }: { title: string; value: number; value2?: string; color: string }) => (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "Escrow Management",
          headerStyle: { backgroundColor: "#3B82F6" },
          headerTintColor: "#fff",
        }}
      />

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <StatCard title="Total" value={stats.total} color="#3B82F6" />
        <StatCard title="Pending" value={stats.pending} color="#F59E0B" />
        <StatCard title="Released" value={stats.released} color="#10B981" />
        <StatCard title="Disputed" value={stats.disputed} color="#EF4444" />
      </View>

      {/* Total Amount */}
      <View style={styles.totalAmountCard}>
        <Text style={styles.totalAmountTitle}>Total Amount Held</Text>
        <Text style={styles.totalAmountValue}>{formatCurrency(stats.total_amount)}</Text>
        <Text style={styles.pendingAmount}>Pending: {formatCurrency(stats.pending_amount)}</Text>
      </View>

      {/* Filter Tabs - SIMPLE */}
      <View style={styles.tabsContainer}>
        {["all", "pending", "released", "disputed", "refunded"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, filter === tab && styles.tabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshHeaderButton} onPress={fetchEscrows}>
        <Feather name="refresh-cw" size={18} color="#3B82F6" />
        <Text style={styles.refreshHeaderText}>Refresh</Text>
      </TouchableOpacity>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading escrows...</Text>
        </View>
      ) : escrows.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="shield" size={60} color="#D1D5DB" />
          <Text style={styles.emptyText}>No escrows found</Text>
          <Text style={styles.emptySubText}>
            {filter !== 'all' ? `No ${filter} escrows` : 'No escrows available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={escrows}
          renderItem={({ item }) => <EscrowCard item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3B82F6"]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Details Modal - CLEAN AND SIMPLE */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedEscrow && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Escrow Details</Text>
                  <TouchableOpacity 
                    onPress={() => setModalVisible(false)}
                    disabled={actionLoading}
                  >
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Amount */}
                  <View style={styles.modalAmountSection}>
                    <Text style={styles.modalAmountLabel}>Amount</Text>
                    <Text style={styles.modalAmountValue}>
                      {formatCurrency(selectedEscrow.amount)}
                    </Text>
                    <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedEscrow.status) }]}>
                      <Text style={styles.modalStatusText}>
                        {selectedEscrow.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Details */}
                  <View style={styles.detailsSection}>
                    <DetailRow label="Escrow ID" value={selectedEscrow.id} />
                    <DetailRow label="Created" value={new Date(selectedEscrow.created_at).toLocaleString()} />
                    {selectedEscrow.released_at && (
                      <DetailRow label="Released" value={new Date(selectedEscrow.released_at).toLocaleString()} />
                    )}
                    {selectedEscrow.order_id && (
                      <DetailRow label="Order ID" value={selectedEscrow.order_id} />
                    )}
                    {selectedEscrow.product_name && (
                      <DetailRow label="Product" value={selectedEscrow.product_name} />
                    )}
                  </View>

                  {/* Parties */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Buyer</Text>
                    <View style={styles.partyCard}>
                      <Text style={styles.partyName}>{selectedEscrow.buyer_name}</Text>
                      <Text style={styles.partyId}>ID: {selectedEscrow.buyer_id}</Text>
                    </View>
                    
                    <Text style={styles.sectionTitle}>Seller</Text>
                    <View style={styles.partyCard}>
                      <Text style={styles.partyName}>{selectedEscrow.seller_name}</Text>
                      <Text style={styles.partyId}>ID: {selectedEscrow.seller_id}</Text>
                    </View>
                  </View>

                  {/* Actions - Only show for pending */}
                  {selectedEscrow.status === "pending" && (
                    <View style={styles.actionsSection}>
                      <Text style={styles.sectionTitle}>Actions</Text>
                      
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.releaseButton]}
                        onPress={() => handleEscrowAction("release")}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Feather name="arrow-up-circle" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Release to Seller</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.refundButton]}
                        onPress={() => handleEscrowAction("refund")}
                        disabled={actionLoading}
                      >
                        <Feather name="arrow-down-circle" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Refund to Buyer</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Simple Detail Row Component
const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    padding: 12,
    minWidth: 70,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Total Amount
  totalAmountCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  totalAmountTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  totalAmountValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  pendingAmount: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  // Refresh Header
  refreshHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginRight: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  refreshHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 6,
  },
  // Loading/Empty States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  idText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  cardBody: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  value: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalAmountSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalAmountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  modalAmountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  modalStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    maxWidth: '60%',
    textAlign: 'right',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  partyCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  partyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  partyId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionsSection: {
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  releaseButton: {
    backgroundColor: '#10B981',
  },
  refundButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});