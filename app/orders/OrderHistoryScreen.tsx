import React, { useState, useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  FlatList,
} from "react-native";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";

const { width, height } = Dimensions.get("window");
const isIOS = Platform.OS === "ios";

type Order = {
  id: string;
  product: {
    id: string;
    name: string;
    image: string;
    price: number;
  };
  seller: {
    id: string;
    name: string;
    location: string;
  };
  quantity: number;
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  order_date: string;
  shipping_address: string;
  delivery_status: string | null;
  delivery_company_id: string | null;
  delivery_fee: number | null;
  type: "product" | "service";
  payment_status: string;
  canComplete: boolean;
  canDispute: boolean;
  hasDelivery: boolean;
  delivery_agent?: string;
  tracking_number?: string;
};

type EscrowStatus = "pending" | "held" | "released" | "refunded" | "disputed";

// Dispute Type Interface
interface DisputeTypeOption {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export default function OrderHistoryScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dispute Modal State
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [disputeType, setDisputeType] = useState<string>("");
  const [disputeTitle, setDisputeTitle] = useState<string>("");
  const [disputeDescription, setDisputeDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  
  // Dispute Types
  const DISPUTE_TYPES: DisputeTypeOption[] = [
    { 
      id: "product_quality", 
      title: "Product Quality Issue", 
      description: "Item is damaged, defective, or not as described",
      icon: "cube-outline"
    },
    { 
      id: "not_delivered", 
      title: "Not Delivered", 
      description: "Item was not delivered or received",
      icon: "close-circle-outline"
    },
    { 
      id: "late_delivery", 
      title: "Late Delivery", 
      description: "Delivery took longer than expected",
      icon: "time-outline"
    },
    { 
      id: "damaged", 
      title: "Damaged Item", 
      description: "Item arrived damaged or broken",
      icon: "warning-outline"
    },
    { 
      id: "wrong_item", 
      title: "Wrong Item", 
      description: "Received wrong item or wrong quantity",
      icon: "swap-horizontal-outline"
    },
    { 
      id: "seller_not_responding", 
      title: "Seller Not Responding", 
      description: "Seller is not communicating or helping",
      icon: "person-remove-outline"
    },
    { 
      id: "payment_issue", 
      title: "Payment Issue", 
      description: "Problem with payment or charges",
      icon: "card-outline"
    },
    { 
      id: "other", 
      title: "Other Issue", 
      description: "Any other problem with this order",
      icon: "ellipsis-horizontal-outline"
    }
  ];

  // Fetch orders from backend
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/orders/buyer/current`, {
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success) {
        const transformedOrders = data.orders.map((order: any) => ({
          id: order.id.toString(),
          product: {
            id: order.product.id,
            name: order.product.name,
            image: order.product.image,
            price: order.product.price
          },
          seller: {
            id: order.seller.id,
            name: order.seller.name,
            location: order.seller.location
          },
          quantity: order.quantity,
          total: order.total,
          status: order.status,
          order_date: new Date(order.order_date).toLocaleDateString(),
          shipping_address: order.shipping_address || 'Not specified',
          delivery_status: order.delivery_status,
          delivery_company_id: order.delivery_company_id,
          delivery_fee: order.delivery_fee,
          type: order.type,
          payment_status: order.payment_status,
          canComplete: order.payment_status === 'pending' && order.status !== 'cancelled',
          canDispute: ['pending', 'confirmed', 'shipped'].includes(order.status) && order.payment_status !== 'disputed',
          hasDelivery: !!order.delivery_company_id,
          delivery_agent: order.delivery_status === 'assigned' ? 'Delivery Agent Assigned' : null,
          tracking_number: order.delivery_status === 'shipped' ? `TRK${order.id.toString().padStart(9, '0')}` : null
        }));
        
        setOrders(transformedOrders);
      } else {
        Alert.alert("Error", "Failed to load orders");
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert("Error", "Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Open Dispute Modal
  const openDisputeModal = (order: Order) => {
    setSelectedOrder(order);
    setDisputeModalVisible(true);
    // Auto-generate title based on order
    setDisputeTitle(`Dispute for Order #${order.id}`);
  };

  // Close Dispute Modal
  const closeDisputeModal = () => {
    setDisputeModalVisible(false);
    setSelectedOrder(null);
    setDisputeType("");
    setDisputeTitle("");
    setDisputeDescription("");
    setSubmitting(false);
  };

  // Handle Image Upload (Simulated)
  const handleUploadEvidence = async () => {
    setUploadingEvidence(true);
    // Simulate upload process
    await new Promise(resolve => setTimeout(resolve, 1000));
    Alert.alert("Info", "Image upload would be implemented with actual camera/gallery picker");
    setUploadingEvidence(false);
  };

  // Submit Dispute
  const submitDispute = async () => {
    if (!selectedOrder) return;
    
    // Validation
    if (!disputeType) {
      Alert.alert("Required", "Please select a dispute type");
      return;
    }
    
    if (!disputeTitle.trim()) {
      Alert.alert("Required", "Please enter a title for your dispute");
      return;
    }
    
    if (!disputeDescription.trim() || disputeDescription.trim().length < 20) {
      Alert.alert("Required", "Please provide a detailed description (at least 20 characters)");
      return;
    }

    setSubmitting(true);

    try {
      // Find escrow ID for this order (you might need to fetch this from API)
      // For now, we'll use the order ID as escrow ID
      const escrowId = selectedOrder.id; // This should come from your API

      const response = await fetch(`${BASE_URL}/api/wallet/raise-dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          escrowId: escrowId,
          orderId: selectedOrder.id,
          disputeType: disputeType,
          title: disputeTitle.trim(),
          description: disputeDescription.trim(),
          evidenceUrls: [] // Add evidence URLs here when implemented
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update local state
        setOrders(prev => prev.map(order => 
          order.id === selectedOrder.id 
            ? { 
                ...order, 
                status: "cancelled", 
                canComplete: false, 
                canDispute: false,
                payment_status: 'disputed'
              }
            : order
        ));
        
        Alert.alert(
          "Dispute Submitted",
          "Your dispute has been submitted successfully. Our admin team will review your case and contact you shortly.",
          [{ text: "OK", onPress: closeDisputeModal }]
        );
        
        fetchOrders(); // Refresh data
      } else {
        Alert.alert("Error", data.message || "Failed to submit dispute");
      }
    } catch (error) {
      console.error('Error submitting dispute:', error);
      Alert.alert("Error", "Failed to submit dispute. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Order Actions
  const handleCompleteOrder = async (orderId: string) => {
    Alert.alert(
      "Confirm Order Completion",
      "Have you received the item/service in good condition? This will release payment from escrow to the seller.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Complete", 
          style: "default",
          onPress: async () => {
            try {
              const releaseResponse = await fetch(`${BASE_URL}/api/wallet/confirm-received`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  orderId: orderId
                }),
              });

              const releaseData = await releaseResponse.json();
              
              if (releaseResponse.ok) {
                const order = orders.find(o => o.id === orderId);
                if (order?.delivery_fee && order?.delivery_company_id) {
                  try {
                    await fetch(`${BASE_URL}/api/delivery/confirm`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                      body: JSON.stringify({
                        orderId: orderId
                      }),
                    });
                  } catch (deliveryError) {
                    console.error('Error confirming delivery:', deliveryError);
                  }
                }

                setOrders(prev => prev.map(order => 
                  order.id === orderId 
                    ? { 
                        ...order, 
                        status: "delivered", 
                        canComplete: false, 
                        canDispute: false,
                        payment_status: 'completed'
                      }
                    : order
                ));
                
                Alert.alert("Success", "Order completed! Payment has been released from escrow.");
                fetchOrders();
              } else {
                Alert.alert("Error", releaseData.message || "Failed to complete order");
              }
            } catch (error) {
              console.error('Error completing order:', error);
              Alert.alert("Error", "Failed to complete order. Please try again.");
            }
          }
        },
      ]
    );
  };

  const handleConfirmDeliveryOnly = async (orderId: string) => {
    Alert.alert(
      "Confirm Delivery Completion",
      "Have you received the delivery? This will release the delivery fee to the delivery agent.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Confirm", 
          style: "default",
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/api/delivery/confirm`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  orderId: orderId
                }),
              });

              const data = await response.json();
              
              if (response.ok) {
                setOrders(prev => prev.map(order => 
                  order.id === orderId 
                    ? { 
                        ...order, 
                        delivery_status: "delivered",
                        canComplete: true
                      }
                    : order
                ));
                
                Alert.alert("Success", "Delivery confirmed! Payment released to delivery agent.");
                fetchOrders();
              } else {
                Alert.alert("Error", data.message || "Failed to confirm delivery");
              }
            } catch (error) {
              console.error('Error confirming delivery:', error);
              Alert.alert("Error", "Failed to confirm delivery. Please try again.");
            }
          }
        },
      ]
    );
  };

  // Helper Functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "#34C759";
      case "shipped": return "#FF9500";
      case "confirmed": return "#007AFF";
      case "pending": return "#FFCC00";
      case "cancelled": return "#FF3B30";
      default: return "#8E8E93";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "delivered": return "Delivered";
      case "shipped": return "In Transit";
      case "confirmed": return "Confirmed";
      case "pending": return "Processing";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  const getDeliveryStatusText = (deliveryStatus: string | null) => {
    if (!deliveryStatus) return "No delivery";
    
    switch (deliveryStatus) {
      case "assigned": return "Agent Assigned";
      case "picked_up": return "Picked Up";
      case "in_transit": return "In Transit";
      case "delivered": return "Delivered";
      default: return deliveryStatus;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  // Render Loading
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Dispute Type Item Component
  const DisputeTypeItem = ({ item }: { item: DisputeTypeOption }) => (
    <TouchableOpacity
      style={[
        styles.disputeTypeItem,
        disputeType === item.id && styles.disputeTypeItemSelected
      ]}
      onPress={() => setDisputeType(item.id)}
    >
      <View style={styles.disputeTypeIcon}>
        <Ionicons 
          name={item.icon as any} 
          size={22} 
          color={disputeType === item.id ? "#007AFF" : "#8E8E93"} 
        />
      </View>
      <View style={styles.disputeTypeContent}>
        <Text style={[
          styles.disputeTypeTitle,
          disputeType === item.id && styles.disputeTypeTitleSelected
        ]}>
          {item.title}
        </Text>
        <Text style={styles.disputeTypeDescription}>
          {item.description}
        </Text>
      </View>
      {disputeType === item.id && (
        <Ionicons name="checkmark-circle" size={22} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  // Order Card Component
  const OrderCard = ({ item }: { item: Order }) => {

  // 🔍 DEBUG: see why buttons are not showing
  console.log("ORDER DEBUG:", {
    id: item.id,
    status: item.status,
    payment_status: item.payment_status,
    canComplete: item.canComplete,
    hasDelivery: item.hasDelivery,
    delivery_status: item.delivery_status,
  });

  return (
    <View style={styles.orderCard}>
      {/* Product Info */}
      <View style={styles.productSection}>
        {item.product.image ? (
          <Image
            source={{ uri: item.product.image }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImage}>
            <Ionicons name="cube-outline" size={32} color="#C7C7CC" />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.product.name}
          </Text>
          <Text style={styles.seller} numberOfLines={1}>
            Seller: {item.seller.name}
          </Text>
          <Text style={styles.price}>{formatCurrency(item.total)}</Text>
          <Text style={styles.orderDate}>Ordered: {item.order_date}</Text>
        </View>
      </View>

      {/* Status */}
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Order Status</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        {item.hasDelivery && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Delivery</Text>
            <Text style={styles.deliveryStatus}>
              {getDeliveryStatusText(item.delivery_status)}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>

        {/* ✅ CONFIRM BUTTON */}
        {(item.canComplete || item.delivery_status === "assigned") && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => {
              if (item.delivery_status === "assigned") {
                handleConfirmDeliveryOnly(item.id);
              } else {
                handleCompleteOrder(item.id);
              }
            }}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color="#fff"
            />
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        )}

        {/* ❌ Submit Dispute */}
        {item.canDispute && (
          <TouchableOpacity
            style={styles.disputeButton}
            onPress={() => openDisputeModal(item)}
          >
            <Ionicons name="warning" size={18} color="#fff" />
            <Text style={styles.disputeButtonText}>Submit Dispute</Text>
          </TouchableOpacity>
        )}

        {/* Info states */}
        {item.payment_status === "disputed" && (
          <View style={styles.disputeInfo}>
            <Ionicons name="time-outline" size={16} color="#FF9500" />
            <Text style={styles.disputeInfoText}>
              Dispute under admin review
            </Text>
          </View>
        )}

        {item.status === "delivered" &&
          item.payment_status === "completed" && (
            <View style={styles.completedInfo}>
              <Ionicons name="checkmark-done" size={16} color="#34C759" />
              <Text style={styles.completedInfoText}>
                Order completed - All payments released
              </Text>
            </View>
          )}
      </View>
    </View>
  );
};


  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color="#007AFF" />
        <Text style={styles.infoText}>
          Track your orders and confirm completion to release payments.
        </Text>
      </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        renderItem={({ item }) => <OrderCard item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007AFF"]}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={80} color="#C7C7CC" />
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubtext}>Your orders will appear here</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 30 }} />}
      />

      {/* Dispute Submission Modal */}
      <Modal
        animationType="slide"
        visible={disputeModalVisible}
        onRequestClose={closeDisputeModal}
        presentationStyle={isIOS ? "pageSheet" : "fullScreen"}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={closeDisputeModal}
              style={styles.modalCloseButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Submit Dispute</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView 
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            {/* Order Info */}
            {selectedOrder && (
              <View style={styles.orderSummary}>
                <Text style={styles.orderSummaryTitle}>Order #{selectedOrder.id}</Text>
                <Text style={styles.orderSummaryProduct} numberOfLines={2}>
                  {selectedOrder.product.name}
                </Text>
                <Text style={styles.orderSummaryAmount}>
                  Amount: {formatCurrency(selectedOrder.total)}
                </Text>
              </View>
            )}

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
              <View style={[styles.step, styles.stepActive]}>
                <Text style={styles.stepText}>1</Text>
                <Text style={styles.stepLabel}>Select Type</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={[styles.step, disputeType ? styles.stepActive : styles.stepInactive]}>
                <Text style={styles.stepText}>2</Text>
                <Text style={styles.stepLabel}>Add Details</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={[styles.step, styles.stepInactive]}>
                <Text style={styles.stepText}>3</Text>
                <Text style={styles.stepLabel}>Submit</Text>
              </View>
            </View>

            {/* Step 1: Dispute Type Selection */}
            <View style={styles.stepSection}>
              <Text style={styles.stepTitle}>Select Dispute Type</Text>
              <Text style={styles.stepDescription}>
                Choose the category that best describes your issue
              </Text>
              
              <FlatList
                data={DISPUTE_TYPES}
                renderItem={({ item }) => <DisputeTypeItem item={item} />}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                style={styles.disputeTypesList}
              />
            </View>

            {/* Step 2: Dispute Details (Only show if type selected) */}
            {disputeType && (
              <View style={styles.stepSection}>
                <Text style={styles.stepTitle}>Dispute Details</Text>
                <Text style={styles.stepDescription}>
                  Provide detailed information about your issue
                </Text>

                {/* Title Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Dispute Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter a clear title for your dispute"
                    value={disputeTitle}
                    onChangeText={setDisputeTitle}
                    placeholderTextColor="#8E8E93"
                    maxLength={100}
                  />
                  <Text style={styles.charCount}>
                    {disputeTitle.length}/100 characters
                  </Text>
                </View>

                {/* Description Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Detailed Description *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Describe the issue in detail. Include any relevant information about what went wrong..."
                    value={disputeDescription}
                    onChangeText={setDisputeDescription}
                    placeholderTextColor="#8E8E93"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    maxLength={1000}
                  />
                  <Text style={styles.charCount}>
                    {disputeDescription.length}/1000 characters
                  </Text>
                </View>

                {/* Evidence Upload (Optional) */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Evidence (Optional)</Text>
                  <Text style={styles.inputSubLabel}>
                    Upload photos, screenshots, or documents to support your claim
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={handleUploadEvidence}
                    disabled={uploadingEvidence}
                  >
                    {uploadingEvidence ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={24} color="#007AFF" />
                        <Text style={styles.uploadButtonText}>Upload Evidence</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <Text style={styles.uploadHint}>
                    Maximum 5 images, 5MB each. Supported: JPG, PNG, PDF
                  </Text>
                </View>

                {/* Resolution Preference */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Desired Resolution</Text>
                  <Text style={styles.inputSubLabel}>
                    What would you like to happen? (Admin will make final decision)
                  </Text>
                  
                  <View style={styles.resolutionOptions}>
                    <TouchableOpacity style={styles.resolutionOption}>
                      <Ionicons name="arrow-undo-circle-outline" size={20} color="#007AFF" />
                      <Text style={styles.resolutionOptionText}>Full Refund</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.resolutionOption}>
                      <Ionicons name="refresh-circle-outline" size={20} color="#FF9500" />
                      <Text style={styles.resolutionOptionText}>Replacement</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.resolutionOption}>
                      <Ionicons name="pricetag-outline" size={20} color="#34C759" />
                      <Text style={styles.resolutionOptionText}>Partial Refund</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Terms Agreement */}
                <View style={styles.termsContainer}>
                  <Text style={styles.termsText}>
                    By submitting this dispute, you agree that:
                  </Text>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    <Text style={styles.termText}>
                      You have attempted to resolve this issue with the seller
                    </Text>
                  </View>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    <Text style={styles.termText}>
                      All information provided is accurate and truthful
                    </Text>
                  </View>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    <Text style={styles.termText}>
                      Admin decision is final and binding
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={closeDisputeModal}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  styles.submitButton,
                  (!disputeType || !disputeTitle.trim() || !disputeDescription.trim()) && styles.submitButtonDisabled
                ]}
                onPress={submitDispute}
                disabled={submitting || !disputeType || !disputeTitle.trim() || !disputeDescription.trim()}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Dispute</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: isIOS ? 10 : 20,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  placeholder: {
    width: 32,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    padding: 16,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  infoText: {
    flex: 1,
    color: "#1565C0",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 5,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  productSection: {
    flexDirection: "row",
    marginBottom: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 16,
    backgroundColor: '#F2F2F7',
  },
  noImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#1D1D1F",
    lineHeight: 22,
  },
  seller: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: "#C7C7CC",
    fontStyle: 'italic',
  },
  statusSection: {
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
    paddingTop: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 90,
    alignItems: 'center',
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  deliveryStatus: {
    fontSize: 14,
    fontWeight: "600",
  },
  deliveryFee: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "700",
  },
  trackingNumber: {
    fontSize: 14,
    color: "#007AFF",
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  actionButtons: {
    gap: 10,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#34C759",
    paddingVertical: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#34C759",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmDeliveryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  confirmDeliveryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disputeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#FF3B30",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  disputeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disputeInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFECEC",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  disputeInfoText: {
    color: "#D32F2F",
    fontSize: 14,
    fontWeight: "600",
  },
  completedInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#E8F5E9",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  completedInfoText: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "600",
  },
  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#F2F2F7",
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  orderSummary: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  orderSummaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 4,
  },
  orderSummaryProduct: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 8,
    lineHeight: 22,
  },
  orderSummaryAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  step: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  stepActive: {
    backgroundColor: "#007AFF",
  },
  stepInactive: {
    backgroundColor: "#E5E5EA",
  },
  stepText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  stepLabel: {
    fontSize: 10,
    color: "#8E8E93",
    marginTop: 4,
    textAlign: "center",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E5E5EA",
    marginHorizontal: 8,
  },
  stepSection: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 20,
    lineHeight: 20,
  },
  disputeTypesList: {
    marginTop: 8,
  },
  disputeTypeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#F2F2F7",
    marginBottom: 8,
    backgroundColor: "#F8F9FF",
  },
  disputeTypeItemSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#E3F2FD",
  },
  disputeTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  disputeTypeContent: {
    flex: 1,
  },
  confirmButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  backgroundColor: "#007AFF",
  paddingVertical: 14,
  borderRadius: 12,
},
confirmButtonText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
},

  disputeTypeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 4,
  },
  disputeTypeTitleSelected: {
    color: "#007AFF",
  },
  disputeTypeDescription: {
    fontSize: 13,
    color: "#8E8E93",
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 8,
  },
  inputSubLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 12,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1D1D1F",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#C7C7CC",
    textAlign: "right",
    marginTop: 4,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#F0F7FF",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#BBDEFB",
    borderStyle: "dashed",
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  uploadHint: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 6,
    textAlign: "center",
  },
  resolutionOptions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  resolutionOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F2F2F7",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  resolutionOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1D1D1F",
  },
  termsContainer: {
    backgroundColor: "#F8F9FF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3F2FD",
  },
  termsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 12,
  },
  termItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 10,
  },
  termText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F2F2F7",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8E8E93",
  },
  submitButton: {
    backgroundColor: "#FF3B30",
    ...Platform.select({
      ios: {
        shadowColor: "#FF3B30",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: "#FFCDD2",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});