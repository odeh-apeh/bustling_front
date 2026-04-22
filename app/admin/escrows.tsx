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
  TextInput,
  Dimensions,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";

const { width, height } = Dimensions.get('window');
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
  transaction_ref?: string;
  dispute_reason?: string;
  dispute_notes?: string;
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
  
  // Release/Reject modal states
  const [fundsModalVisible, setFundsModalVisible] = useState(false);
  const [fundsAction, setFundsAction] = useState<'release' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const {showToast} = useToast();

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
      
      if (data.success) {
        setEscrows(data.escrows || []);
        setStats(data.stats || stats);
      } else {
        showToast(data.message || "Failed to load escrows", 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast("Failed to load escrows", 'error');
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

  // Open funds action modal
  const openFundsAction = (escrow: Escrow, action: 'release' | 'reject') => {
    setSelectedEscrow(escrow);
    setFundsAction(action);
    setRejectionReason('');
    setReleaseNotes('');
    setFundsModalVisible(true);
  };

  // Confirm action
  const confirmAction = () => {
    if (fundsAction === 'reject' && !rejectionReason.trim()) {
      showToast('Please provide a reason for rejection', 'error');
      return;
    }
    setConfirmationModalVisible(true);
  };

  // Execute escrow action
  const executeEscrowAction = async () => {
    if (!selectedEscrow) return;

    setActionLoading(true);
    try {
      const endpoint = fundsAction === "release" ? "release-escrow" : "refund-escrow";
      const payload: any = {
        escrowId: selectedEscrow.id
      };
      
      if (fundsAction === 'release' && releaseNotes) {
        payload.notes = releaseNotes;
      }
      
      if (fundsAction === 'reject' && rejectionReason) {
        payload.reason = rejectionReason;
        payload.notes = rejectionReason;
      }

      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok) {
        showToast(`Escrow ${fundsAction}ed successfully`, 'success');
        setFundsModalVisible(false);
        setConfirmationModalVisible(false);
        setModalVisible(false);
        setSelectedEscrow(null);
        fetchEscrows();
      } else {
        showToast(data.message || `Failed to ${fundsAction} escrow`, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast(`Failed to ${fundsAction} escrow`, 'error');
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
      year: 'numeric',
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

  // Escrow card
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
        
        {item.product_name && (
          <View style={styles.row}>
            <Feather name="box" size={14} color="#6B7280" />
            <Text style={styles.label}>Product: </Text>
            <Text style={styles.value} numberOfLines={1}>{item.product_name}</Text>
          </View>
        )}
      </View>
      
      {/* Quick Action Button for Pending Escrows */}
      {item.status === 'pending' && (
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.cardActionButton, styles.rejectCardButton]}
            onPress={() => openFundsAction(item, 'reject')}
          >
            <Feather name="x-circle" size={16} color="#EF4444" />
            <Text style={styles.rejectCardText}>Reject & Refund</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.cardActionButton, styles.releaseCardButton]}
            onPress={() => openFundsAction(item, 'release')}
          >
            <Feather name="check-circle" size={16} color="#10B981" />
            <Text style={styles.releaseCardText}>Release Funds</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  // Stats card
  const StatCard = ({ title, value, color }: { title: string; value: number; color: string }) => (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          header: () => (
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Escrow Management</Text>
              <TouchableOpacity onPress={fetchEscrows} style={styles.headerRefresh}>
                <Ionicons name="refresh-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <StatCard title="Total" value={stats.total} color="#3B82F6" />
          <StatCard title="Pending" value={stats.pending} color="#F59E0B" />
          <StatCard title="Released" value={stats.released} color="#10B981" />
          <StatCard title="Disputed" value={stats.disputed} color="#EF4444" />
        </View>

        {/* Total Amount Card */}
        <View style={styles.totalAmountCard}>
          <View>
            <Text style={styles.totalAmountTitle}>Total Amount Held</Text>
            <Text style={styles.totalAmountValue}>{formatCurrency(stats.total_amount)}</Text>
          </View>
          <View style={styles.pendingAmountContainer}>
            <Text style={styles.pendingAmountLabel}>Pending Release:</Text>
            <Text style={styles.pendingAmountValue}>{formatCurrency(stats.pending_amount)}</Text>
          </View>
        </View>

        {/* Filter Tabs */}
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
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Funds Action Modal (Release/Reject) */}
      <Modal
        visible={fundsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFundsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fundsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {fundsAction === 'release' ? 'Release Funds' : 'Reject & Refund'}
              </Text>
              <TouchableOpacity 
                onPress={() => setFundsModalVisible(false)}
                disabled={actionLoading}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedEscrow && (
              <ScrollView style={styles.fundsModalBody}>
                {/* Amount Summary */}
                <View style={styles.fundsAmountCard}>
                  <Text style={styles.fundsAmountLabel}>Amount to {fundsAction === 'release' ? 'Release' : 'Refund'}</Text>
                  <Text style={styles.fundsAmountValue}>{formatCurrency(selectedEscrow.amount)}</Text>
                  <View style={styles.fundsParties}>
                    <View style={styles.fundsParty}>
                      <Feather name="user" size={14} color="#666" />
                      <Text style={styles.fundsPartyText}>Buyer: {selectedEscrow.buyer_name}</Text>
                    </View>
                    <Feather name="arrow-right" size={14} color="#999" />
                    <View style={styles.fundsParty}>
                      <Feather name="user" size={14} color="#666" />
                      <Text style={styles.fundsPartyText}>Seller: {selectedEscrow.seller_name}</Text>
                    </View>
                  </View>
                </View>

                {fundsAction === 'release' ? (
                  // Release Form
                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>Release Notes (Optional)</Text>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Add notes about this release..."
                      placeholderTextColor="#999"
                      value={releaseNotes}
                      onChangeText={setReleaseNotes}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                    
                    <View style={styles.infoBox}>
                      <Ionicons name="information-circle" size={20} color="#3B82F6" />
                      <Text style={styles.infoText}>
                        Releasing funds will transfer the amount to the seller&apos;s wallet.
                        This action cannot be undone.
                      </Text>
                    </View>
                  </View>
                ) : (
                  // Rejection Form
                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>Rejection Reason *</Text>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Explain why this escrow is being rejected..."
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
                        Refunding will return the amount to the buyer&apos;s wallet.
                        The seller will not receive payment for this transaction.
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.fundsModalButtons}>
                  <TouchableOpacity
                    style={[styles.fundsModalButton, styles.cancelButton]}
                    onPress={() => setFundsModalVisible(false)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.fundsModalButton,
                      fundsAction === 'release' ? styles.releaseModalButton : styles.rejectModalButton
                    ]}
                    onPress={confirmAction}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>
                        {fundsAction === 'release' ? 'Confirm Release' : 'Confirm Refund'}
                      </Text>
                    )}
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
                name={fundsAction === 'release' ? "checkmark-circle" : "warning"} 
                size={50} 
                color={fundsAction === 'release' ? "#10B981" : "#EF4444"} 
              />
            </View>
            <Text style={styles.confirmTitle}>
              {fundsAction === 'release' ? 'Release Funds?' : 'Reject & Refund?'}
            </Text>
            <Text style={styles.confirmMessage}>
              {fundsAction === 'release' 
                ? `Are you sure you want to release ₦${selectedEscrow?.amount?.toLocaleString()} to ${selectedEscrow?.seller_name}?`
                : `Are you sure you want to reject this escrow and refund ₦${selectedEscrow?.amount?.toLocaleString()} to ${selectedEscrow?.buyer_name}?`
              }
            </Text>
            {fundsAction === 'reject' && rejectionReason && (
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
                  fundsAction === 'release' ? styles.confirmReleaseButton : styles.confirmRejectButton
                ]}
                onPress={executeEscrowAction}
              >
                <Text style={styles.confirmActionText}>
                  {fundsAction === 'release' ? 'Yes, Release' : 'Yes, Refund'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
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
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
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
                    {selectedEscrow.transaction_ref && (
                      <DetailRow label="Transaction Ref" value={selectedEscrow.transaction_ref} />
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Parties</Text>
                    <View style={styles.partyCard}>
                      <Text style={styles.partyName}>{selectedEscrow.buyer_name}</Text>
                      <Text style={styles.partyId}>Buyer ID: {selectedEscrow.buyer_id}</Text>
                    </View>
                    
                    <View style={styles.partyCard}>
                      <Text style={styles.partyName}>{selectedEscrow.seller_name}</Text>
                      <Text style={styles.partyId}>Seller ID: {selectedEscrow.seller_id}</Text>
                    </View>
                  </View>

                  {selectedEscrow.dispute_reason && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Dispute Details</Text>
                      <View style={styles.disputeCard}>
                        <Text style={styles.disputeReason}>{selectedEscrow.dispute_reason}</Text>
                        {selectedEscrow.dispute_notes && (
                          <Text style={styles.disputeNotes}>{selectedEscrow.dispute_notes}</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Action Buttons in Details Modal */}
                  {selectedEscrow.status === "pending" && (
                    <View style={styles.actionsSection}>
                      <Text style={styles.sectionTitle}>Funds Action</Text>
                      
                      <TouchableOpacity 
                        style={[styles.detailActionButton, styles.rejectDetailButton]}
                        onPress={() => {
                          setModalVisible(false);
                          openFundsAction(selectedEscrow, 'reject');
                        }}
                        disabled={actionLoading}
                      >
                        <Feather name="x-circle" size={20} color="#EF4444" />
                        <Text style={styles.rejectDetailText}>Reject & Refund to Buyer</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.detailActionButton, styles.releaseDetailButton]}
                        onPress={() => {
                          setModalVisible(false);
                          openFundsAction(selectedEscrow, 'release');
                        }}
                        disabled={actionLoading}
                      >
                        <Feather name="check-circle" size={20} color="#10B981" />
                        <Text style={styles.releaseDetailText}>Release to Seller</Text>
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

// Detail Row Component
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
  header: {
    height: 100,
    backgroundColor: '#3986f9',
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
  headerRefresh: {
    padding: 8,
  },
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
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  totalAmountCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAmountTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  totalAmountValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  pendingAmountContainer: {
    alignItems: 'flex-end',
  },
  pendingAmountLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  pendingAmountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 8,
    flexWrap: 'wrap',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
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
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
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
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
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
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8,
  },
  value: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 4,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  rejectCardButton: {
    backgroundColor: '#FEF2F2',
  },
  releaseCardButton: {
    backgroundColor: '#F0FDF4',
  },
  rejectCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  releaseCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  fundsModalContent: {
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
  fundsModalBody: {
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
    marginBottom: 12,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  partyId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  disputeCard: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  disputeReason: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
  },
  disputeNotes: {
    fontSize: 13,
    color: '#666',
  },
  actionsSection: {
    marginBottom: 30,
  },
  detailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  rejectDetailButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  releaseDetailButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  rejectDetailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  releaseDetailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },
  fundsAmountCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  fundsAmountLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  fundsAmountValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  fundsParties: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fundsParty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fundsPartyText: {
    fontSize: 12,
    color: '#666',
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    backgroundColor: '#fff',
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
  infoText: {
    fontSize: 12,
    color: '#3B82F6',
    flex: 1,
    lineHeight: 16,
  },
  infoTextWarning: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
    lineHeight: 16,
  },
  fundsModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 30,
  },
  fundsModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  releaseModalButton: {
    backgroundColor: '#10B981',
  },
  rejectModalButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButtonText: {
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
  reasonPreview: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  reasonPreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
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
    backgroundColor: '#F3F4F6',
  },
  confirmReleaseButton: {
    backgroundColor: '#10B981',
  },
  confirmRejectButton: {
    backgroundColor: '#EF4444',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});