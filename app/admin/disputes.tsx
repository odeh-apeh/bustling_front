import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  RefreshControl,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView} from 'react-native-safe-area-context';
import { BASE_URL } from "@/helpers/core-service";


const { width, height } = Dimensions.get("window");
const isIOS = Platform.OS === "ios";

// Types
type DisputeStatus = "pending" | "under_review" | "resolved" | "cancelled";
type DisputeType = "product_quality" | "not_delivered" | "late_delivery" | "damaged" | "wrong_item" | "seller_not_responding" | "buyer_not_responding" | "payment_issue" | "other";
type ResolutionType = "release_to_seller" | "refund_to_buyer" | "partial_refund" | "split_payment" | "case_dismissed";

interface Dispute {
  id: string;
  order_id: string;
  escrow_id: string;
  title: string;
  description: string;
  dispute_type: DisputeType;
  status: DisputeStatus;
  raised_by: {
    id: string;
    name: string;
    phone: string;
    email: string;
    role: "buyer" | "seller" | "delivery_agent";
  };
  disputed_user: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  product: {
    id: string;
    name: string;
    type: "product" | "service";
    price: number;
    description?: string;
    image?: string;
  };
  order: {
    amount: number;
    status: string;
    payment_status: string;
    date: string;
    shipping_address?: string;
    delivery_status?: string;
    delivery_company?: {
      id: string;
      name: string;
      phone: string;
    } | null;
  };
  escrow: {
    amount: number;
    status: string;
    created: string;
  };
  evidence: string[];
  resolution: ResolutionType | null;
  admin_notes: string;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  messages?: Array<{
    id: string;
    user_id: string;
    user_name: string;
    user_role: string;
    message: string;
    is_internal: boolean;
    created_at: string;
  }>;
}

// API Base URL
const API_BASE_URL = `${BASE_URL}/api/admin`;

export default function AdminDisputesScreen() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    under_review: 0,
    resolved: 0,
    cancelled: 0,
  });
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [detailModal, setDetailModal] = useState(false);
  const [resolutionModal, setResolutionModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [activeTab, setActiveTab] = useState<DisputeStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch disputes
  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const adminToken = await AsyncStorage.getItem("adminToken");
      
      const url = new URL(`${API_BASE_URL}/disputes`);
      if (activeTab !== "all") {
        url.searchParams.append("status", activeTab);
      }
      if (searchQuery.trim()) {
        url.searchParams.append("search", searchQuery.trim());
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setDisputes(data.disputes || []);
        setStats(data.stats || stats);
      } else {
        Alert.alert("Error", data.message || "Failed to load disputes");
      }
    } catch (error) {
      console.error("Fetch disputes error:", error);
      Alert.alert("Error", "Failed to load disputes. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch dispute details
  const fetchDisputeDetails = async (disputeId: string) => {
    try {
      setDetailLoading(true);
      const adminToken = await AsyncStorage.getItem("adminToken");
      
      const response = await fetch(`${API_BASE_URL}/disputes/${disputeId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.dispute) {
        setSelectedDispute(data.dispute);
        setAdminNotes(data.dispute.admin_notes || "");
      } else {
        Alert.alert("Error", data.message || "Failed to load dispute details");
      }
    } catch (error) {
      console.error("Fetch dispute details error:", error);
      Alert.alert("Error", "Failed to load dispute details");
    } finally {
      setDetailLoading(false);
    }
  };

  // Format functions
  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
  const getStatusColor = (status: DisputeStatus) => {
    switch(status) {
      case 'pending': return '#FF9500';
      case 'under_review': return '#5856D6';
      case 'resolved': return '#34C759';
      case 'cancelled': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  // Open dispute details
  const openDisputeDetails = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setDetailModal(true);
    fetchDisputeDetails(dispute.id);
  };

  // Open resolution modal
  const openResolutionModal = () => {
    setResolutionModal(true);
  };

  // Initial load
  useEffect(() => {
    fetchDisputes();
  }, [activeTab, searchQuery]);

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchDisputes();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Dispute Management",
          headerStyle: { backgroundColor: "#0A6BFF" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Disputes</Text>
          <View style={styles.headerStats}>
            <View style={styles.statChip}>
              <Text style={styles.statChipText}>{stats.total} Total</Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: '#FF950020' }]}>
              <Text style={[styles.statChipText, { color: '#FF9500' }]}>{stats.pending} Pending</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search disputes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color="#8E8E93" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {[
            { key: 'all', label: 'All', icon: 'list' },
            { key: 'pending', label: 'Pending', icon: 'clock' },
            { key: 'under_review', label: 'Review', icon: 'eye' },
            { key: 'resolved', label: 'Resolved', icon: 'check-circle' },
            { key: 'cancelled', label: 'Cancelled', icon: 'x-circle' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Feather 
                name={tab.icon as any} 
                size={16} 
                color={activeTab === tab.key ? "#0A6BFF" : "#8E8E93"} 
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A6BFF" />
          <Text style={styles.loadingText}>Loading disputes...</Text>
        </View>
      ) : disputes.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="file-text" size={60} color="#C7C7CC" />
          </View>
          <Text style={styles.emptyTitle}>No disputes found</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab !== 'all' 
              ? `No ${activeTab} disputes at the moment`
              : "All disputes are currently resolved"}
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={fetchDisputes}
          >
            <Feather name="refresh-cw" size={16} color="#0A6BFF" />
            <Text style={styles.emptyButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0A6BFF"]}
              tintColor="#0A6BFF"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.disputeCard}
              onPress={() => openDisputeDetails(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.orderId}>ORDER #{item.order_id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.disputeTitle} numberOfLines={1}>{item.title}</Text>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Feather name="user" size={14} color="#8E8E93" />
                  <Text style={styles.infoLabel}>Raised by:</Text>
                  <Text style={styles.infoValue}>{item.raised_by.name}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{item.raised_by.role}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Feather name="package" size={14} color="#8E8E93" />
                  <Text style={styles.infoLabel}>Product:</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{item.product.name}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Feather name="dollar-sign" size={14} color="#8E8E93" />
                  <Text style={styles.infoLabel}>Amount:</Text>
                  <Text style={[styles.infoValue, styles.amountText]}>{formatCurrency(item.escrow.amount)}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Feather name="calendar" size={14} color="#8E8E93" />
                  <Text style={styles.infoLabel}>Created:</Text>
                  <Text style={styles.infoValue}>{formatDate(item.created_at)}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.evidenceBadge}>
                  <Feather name="image" size={12} color="#8E8E93" />
                  <Text style={styles.evidenceText}>{item.evidence?.length || 0} evidence</Text>
                </View>
                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Details</Text>
                  <Feather name="chevron-right" size={16} color="#0A6BFF" />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={<View style={{ height: 30 }} />}
        />
      )}

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        visible={detailModal}
        onRequestClose={() => setDetailModal(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalSafeArea}>
          {detailLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#0A6BFF" />
            </View>
          ) : selectedDispute ? (
            <>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.modalClose}
                  onPress={() => setDetailModal(false)}
                >
                  <Feather name="x" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Dispute Details</Text>
                <TouchableOpacity 
                  style={styles.modalAction}
                  onPress={() => fetchDisputeDetails(selectedDispute.id)}
                >
                  <Feather name="refresh-cw" size={20} color="#0A6BFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Status Bar */}
                <View style={[styles.statusBar, { backgroundColor: getStatusColor(selectedDispute.status) + '20' }]}>
                  <View style={styles.statusBarContent}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedDispute.status) }]} />
                    <Text style={[styles.statusLabel, { color: getStatusColor(selectedDispute.status) }]}>
                      {selectedDispute.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                  {selectedDispute.resolution && (
                    <Text style={styles.resolutionLabel}>
                      Resolution: {selectedDispute.resolution.replace(/_/g, ' ')}
                    </Text>
                  )}
                </View>

                {/* Dispute Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Dispute Information</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoItemLabel}>Title</Text>
                      <Text style={styles.infoItemValue}>{selectedDispute.title}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoItemLabel}>Type</Text>
                      <Text style={styles.infoItemValue}>{selectedDispute.dispute_type.replace('_', ' ')}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoItemLabel}>Description</Text>
                      <Text style={styles.infoItemValue}>{selectedDispute.description}</Text>
                    </View>
                  </View>
                </View>

                {/* Parties */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Parties Involved</Text>
                  <View style={styles.partiesContainer}>
                    <View style={styles.partyCard}>
                      <View style={styles.partyHeader}>
                        <Feather name="user" size={18} color="#0A6BFF" />
                        <Text style={styles.partyTitle}>Complainant</Text>
                      </View>
                      <Text style={styles.partyName}>{selectedDispute.raised_by.name}</Text>
                      <Text style={styles.partyRole}>{selectedDispute.raised_by.role}</Text>
                      <Text style={styles.partyContact}>{selectedDispute.raised_by.phone}</Text>
                      <Text style={styles.partyContact}>{selectedDispute.raised_by.email}</Text>
                    </View>

                    <View style={styles.partyCard}>
                      <View style={styles.partyHeader}>
                        <Feather name="user" size={18} color="#FF3B30" />
                        <Text style={styles.partyTitle}>Respondent</Text>
                      </View>
                      <Text style={styles.partyName}>{selectedDispute.disputed_user.name}</Text>
                      <Text style={styles.partyRole}>Disputed Against</Text>
                      <Text style={styles.partyContact}>{selectedDispute.disputed_user.phone}</Text>
                      <Text style={styles.partyContact}>{selectedDispute.disputed_user.email}</Text>
                    </View>
                  </View>
                </View>

                {/* Order Details */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Order Details</Text>
                  <View style={styles.orderDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Order ID</Text>
                      <Text style={styles.detailValue}>#{selectedDispute.order_id}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Product</Text>
                      <Text style={styles.detailValue}>{selectedDispute.product.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Amount</Text>
                      <Text style={[styles.detailValue, styles.detailAmount]}>{formatCurrency(selectedDispute.order.amount)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={styles.detailValue}>{selectedDispute.order.status}</Text>
                    </View>
                    {selectedDispute.order.shipping_address && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Shipping Address</Text>
                        <Text style={styles.detailValue}>{selectedDispute.order.shipping_address}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Escrow Details */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Escrow Details</Text>
                  <View style={styles.escrowCard}>
                    <View style={styles.escrowHeader}>
                      <Feather name="lock" size={20} color="#34C759" />
                      <Text style={styles.escrowTitle}>Escrow Funds</Text>
                    </View>
                    <Text style={styles.escrowAmount}>{formatCurrency(selectedDispute.escrow.amount)}</Text>
                    <Text style={styles.escrowStatus}>Status: {selectedDispute.escrow.status}</Text>
                    <Text style={styles.escrowDate}>Created: {formatDate(selectedDispute.escrow.created)}</Text>
                  </View>
                </View>

                {/* Evidence */}
                {selectedDispute.evidence.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Evidence ({selectedDispute.evidence.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedDispute.evidence.map((url, index) => (
                        <TouchableOpacity key={index} style={styles.evidenceCard}>
                          <Image source={{ uri: url }} style={styles.evidenceImage} />
                          <Text style={styles.evidenceLabel}>Evidence {index + 1}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Admin Notes */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Admin Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    multiline
                    placeholder="Add internal notes here..."
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    placeholderTextColor="#8E8E93"
                  />
                  <TouchableOpacity style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save Notes</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Quick Actions</Text>
                  <View style={styles.actionsGrid}>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF950020' }]}>
                      <Feather name="message-circle" size={20} color="#FF9500" />
                      <Text style={[styles.actionText, { color: '#FF9500' }]}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#5856D620' }]}
                      onPress={openResolutionModal}
                    >
                      <Feather name="check-circle" size={20} color="#5856D6" />
                      <Text style={[styles.actionText, { color: '#5856D6' }]}>Resolve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF3B3020' }]}>
                      <Feather name="x-circle" size={20} color="#FF3B30" />
                      <Text style={[styles.actionText, { color: '#FF3B30' }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>
            </>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* Resolution Modal */}
      <Modal
        animationType="slide"
        visible={resolutionModal}
        transparent={true}
        onRequestClose={() => setResolutionModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.resolutionModal}>
            <View style={styles.resolutionHeader}>
              <Text style={styles.resolutionTitle}>Resolve Dispute</Text>
              <TouchableOpacity onPress={() => setResolutionModal(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.resolutionContent}>
              <Text style={styles.resolutionSubtitle}>Select resolution type:</Text>
              
              {[
                { 
                  key: 'release_to_seller', 
                  title: 'Release to Seller', 
                  description: 'Release full escrow amount to seller',
                  icon: 'arrow-up-circle',
                  color: '#34C759'
                },
                { 
                  key: 'refund_to_buyer', 
                  title: 'Refund Buyer', 
                  description: 'Refund full amount to buyer',
                  icon: 'arrow-down-circle',
                  color: '#FF3B30'
                },
                { 
                  key: 'partial_refund', 
                  title: 'Partial Refund', 
                  description: 'Split amount between both parties',
                  icon: 'percent',
                  color: '#FF9500'
                },
                { 
                  key: 'split_payment', 
                  title: '50/50 Split', 
                  description: 'Equal split between buyer and seller',
                  icon: 'divide-circle',
                  color: '#5856D6'
                },
                { 
                  key: 'case_dismissed', 
                  title: 'Dismiss Case', 
                  description: 'Dismiss dispute without action',
                  icon: 'x-octagon',
                  color: '#8E8E93'
                }
              ].map((option) => (
                <TouchableOpacity 
                  key={option.key}
                  style={styles.resolutionOption}
                  onPress={() => {
                    Alert.alert(
                      "Confirm Resolution",
                      `Are you sure you want to ${option.title.toLowerCase()}?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Confirm", style: "destructive" }
                      ]
                    );
                  }}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                    <Feather name={option.icon as any} size={24} color={option.color} />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#8E8E93" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  // Header Styles
  header: {
    backgroundColor: "#fff",
    paddingTop: isIOS ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
  },
  headerStats: {
    flexDirection: "row",
    gap: 8,
  },
  statChip: {
    backgroundColor: "#0A6BFF10",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0A6BFF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    marginHorizontal: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#000",
    padding: 0,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F2F2F7",
    gap: 6,
  },
  tabActive: {
    backgroundColor: "#0A6BFF10",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
  },
  tabTextActive: {
    color: "#0A6BFF",
  },
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#8E8E93",
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#F2F2F7",
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0A6BFF",
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0A6BFF",
  },
  // List Content
  listContent: {
    padding: 20,
    paddingTop: 15,
  },
  // Dispute Card
  disputeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderId: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  disputeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  cardBody: {
    gap: 10,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#8E8E93",
    width: 70,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1D1D1F",
    flex: 1,
  },
  amountText: {
    fontWeight: "700",
    color: "#0A6BFF",
  },
  roleBadge: {
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
    paddingTop: 16,
  },
  evidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  evidenceText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0A6BFF",
  },
  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: isIOS ? 10 : 20,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalClose: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  modalAction: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  // Status Bar
  statusBar: {
    padding: 16,
    margin: 20,
    marginTop: 15,
    borderRadius: 12,
  },
  statusBarContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  resolutionLabel: {
    fontSize: 12,
    color: "#8E8E93",
    fontStyle: "italic",
  },
  // Sections
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    gap: 4,
  },
  infoItemLabel: {
    fontSize: 12,
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoItemValue: {
    fontSize: 16,
    color: "#1D1D1F",
    lineHeight: 22,
  },
  // Parties
  partiesContainer: {
    gap: 12,
  },
  partyCard: {
    backgroundColor: "#F8F9FF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  partyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  partyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  partyName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 2,
  },
  partyRole: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 8,
  },
  partyContact: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 2,
  },
  // Order Details
  orderDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 14,
    color: "#8E8E93",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1D1D1F",
    flex: 1,
    textAlign: "right",
  },
  detailAmount: {
    fontWeight: "700",
    color: "#0A6BFF",
  },
  // Escrow Card
  escrowCard: {
    backgroundColor: "#E8F5E9",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  escrowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  escrowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
  },
  escrowAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 4,
  },
  escrowStatus: {
    fontSize: 14,
    color: "#2E7D32",
    marginBottom: 4,
  },
  escrowDate: {
    fontSize: 12,
    color: "#81C784",
    fontStyle: "italic",
  },
  // Evidence
  evidenceCard: {
    marginRight: 12,
    alignItems: "center",
  },
  evidenceImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
    marginBottom: 6,
  },
  evidenceLabel: {
    fontSize: 11,
    color: "#8E8E93",
  },
  // Notes
  notesInput: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    fontSize: 16,
    color: "#1D1D1F",
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#0A6BFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Actions
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Resolution Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  resolutionModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
  },
  resolutionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  resolutionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  resolutionContent: {
    padding: 20,
  },
  resolutionSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 20,
  },
  resolutionOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
    gap: 16,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: "#8E8E93",
  },
});