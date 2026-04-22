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
  Animated,
} from "react-native";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";
import ConfirmationModal from "../modal";

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
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | 'completed';
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

interface DisputeTypeOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export default function OrderHistoryScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  
  // Dispute Modal State
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [disputeType, setDisputeType] = useState<string>("");
  const [disputeTitle, setDisputeTitle] = useState<string>("");
  const [disputeDescription, setDisputeDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const {showToast} = useToast();
  const [open, setOpen] = useState(false);
    const [modalMessages, setModalMessages] = useState({
      title: '',
      message: '',
      variant: 'primary' as 'primary' | 'danger' | 'success',
      onclick: () => {},
      onCancel: () => {
        setOpen(false);
      },
    });
  
  // Dispute Types with colors
  const DISPUTE_TYPES: DisputeTypeOption[] = [
    { 
      id: "product_quality", 
      title: "Product Quality Issue", 
      description: "Item is damaged, defective, or not as described",
      icon: "cube-outline",
      color: "#FF6B6B"
    },
    { 
      id: "not_delivered", 
      title: "Not Delivered", 
      description: "Item was not delivered or received",
      icon: "close-circle-outline",
      color: "#FF9500"
    },
    { 
      id: "late_delivery", 
      title: "Late Delivery", 
      description: "Delivery took longer than expected",
      icon: "time-outline",
      color: "#FFCC00"
    },
    { 
      id: "damaged", 
      title: "Damaged Item", 
      description: "Item arrived damaged or broken",
      icon: "warning-outline",
      color: "#FF3B30"
    },
    { 
      id: "wrong_item", 
      title: "Wrong Item", 
      description: "Received wrong item or wrong quantity",
      icon: "swap-horizontal-outline",
      color: "#5856D6"
    },
    { 
      id: "seller_not_responding", 
      title: "Seller Not Responding", 
      description: "Seller is not communicating or helping",
      icon: "person-remove-outline",
      color: "#FF9500"
    },
    { 
      id: "payment_issue", 
      title: "Payment Issue", 
      description: "Problem with payment or charges",
      icon: "card-outline",
      color: "#AF52DE"
    },
    { 
      id: "other", 
      title: "Other Issue", 
      description: "Any other problem with this order",
      icon: "ellipsis-horizontal-outline",
      color: "#8E8E93"
    }
  ];

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchOrders();
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
        showToast(data.message || "Failed to load orders", "error");
        //Alert.alert("Error", "Failed to load orders" + data.message);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      showToast("Failed to load orders. Please try again.", "error");
      //Alert.alert("Error", "Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const openDisputeModal = (order: Order) => {
    setSelectedOrder(order);
    setDisputeModalVisible(true);
    setDisputeTitle(`Dispute for Order #${order.id}`);
  };

  const closeDisputeModal = () => {
    setDisputeModalVisible(false);
    setSelectedOrder(null);
    setDisputeType("");
    setDisputeTitle("");
    setDisputeDescription("");
    setSubmitting(false);
  };

  const handleUploadEvidence = async () => {
    setUploadingEvidence(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    showToast("Image upload would be implemented with actual camera/gallery picker", "info");
    //Alert.alert("Info", "Image upload would be implemented with actual camera/gallery picker");
    setUploadingEvidence(false);
  };

  const submitDispute = async () => {
    if (!selectedOrder) return;
    
    if (!disputeType) {
      showToast("Please select a dispute type", "error");
      return;
    }
    
    if (!disputeTitle.trim()) {
      showToast("Please enter a title for your dispute", "error");
      return;
    }
    
    if (!disputeDescription.trim() || disputeDescription.trim().length < 20) {
      showToast("Please provide a detailed description (at least 20 characters)", "error");
      return;
    }

    setSubmitting(true);

    try {
      const escrowId = selectedOrder.id;

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
          evidenceUrls: []
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
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
        setModalMessages({
          title: "Dispute Submitted",
          message: "Your dispute has been submitted successfully. Our admin team will review your case and contact you shortly.",
          variant: "success",
          onclick: () => {
            closeDisputeModal();
            fetchOrders();
          },
          onCancel: () => {
            closeDisputeModal();
            fetchOrders();
            setOpen(false);
          }
        });
        setOpen(true);
        // Alert.alert(
        //   "Dispute Submitted",
        //   "Your dispute has been submitted successfully. Our admin team will review your case and contact you shortly.",
        //   [{ text: "OK", onPress: closeDisputeModal }]
        // );
        
        fetchOrders();
      } else {
        showToast(data.message || "Failed to submit dispute", "error");
      }
    } catch (error) {
      console.error('Error submitting dispute:', error);
      showToast("Failed to submit dispute. Please check your connection and try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {

    setModalMessages({
      title: "Confirm Order Completion",
      message: "Have you received the item/service in good condition? This will release payment from escrow to the seller upon admin verification.",
      variant: "primary",
      onclick: async () => {
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
                
                showToast("Order completed! Payment has been released from escrow.", "success");
                fetchOrders();
                setOpen(false);
              } else {
                showToast(releaseData.message || "Failed to complete order", "error");
              }
            } catch (error) {
              console.error('Error completing order:', error);
              showToast("Failed to complete order. Please try again.", "error");
            }
          },
      onCancel: () => setOpen(false)
    });
    setOpen(true);

    // Alert.alert(
    //   "Confirm Order Completion",
    //   "Have you received the item/service in good condition? This will release payment from escrow to the seller.",
    //   [
    //     { text: "Cancel", style: "cancel" },
    //     { 
    //       text: "Yes, Complete", 
    //       style: "default",
    //       onPress: async () => {
            
    //     },
    //   ]
    // );
  };

  const handleConfirmDeliveryOnly = async (orderId: string) => {
    // showToast("Confirming delivery...", "info");
    setModalMessages({
      title: "Confirm Delivery Completion",
      message: "Have you received the delivery? This will release the delivery fee to the delivery agent.",
      variant: "primary",
      onclick: async () => {
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
                showToast("Delivery confirmed! Payment released to delivery agent.", "success");
                
                //Alert.alert("Success", "Delivery confirmed! Payment released to delivery agent.");
                fetchOrders();
                setOpen(false);
              } else {
                showToast(data.message || "Failed to confirm delivery", "error");
              }
            } catch (error) {
              console.error('Error confirming delivery:', error);
              showToast("Failed to confirm delivery. Please try again.", "error");
            }
          },
      onCancel: () => setOpen(false)
    });
    setOpen(true);
            
    // Alert.alert(
    //   "Confirm Delivery Completion",
    //   "Have you received the delivery? This will release the delivery fee to the delivery agent.",
    //   [
    //     { text: "Cancel", style: "cancel" },
    //     { 
    //       text: "Yes, Confirm", 
    //       style: "default",
    //       onPress: async () => 
    //     },
    //   ]
   // );
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered": return "checkmark-done-circle";
      case "shipped": return "car-sport";
      case "confirmed": return "checkmark-circle";
      case "pending": return "time";
      case "cancelled": return "close-circle";
      default: return "ellipse";
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const DisputeTypeItem = ({ item }: { item: DisputeTypeOption }) => (
    <TouchableOpacity
      style={[
        styles.disputeTypeItem,
        disputeType === item.id && { borderColor: item.color, backgroundColor: `${item.color}10` }
      ]}
      onPress={() => setDisputeType(item.id)}
    >
      <View style={[styles.disputeTypeIcon, disputeType === item.id && { backgroundColor: item.color }]}>
        <Ionicons 
          name={item.icon as any} 
          size={22} 
          color={disputeType === item.id ? "#fff" : item.color} 
        />
      </View>
      <View style={styles.disputeTypeContent}>
        <Text style={styles.disputeTypeTitle}>
          {item.title}
        </Text>
        <Text style={styles.disputeTypeDescription}>
          {item.description}
        </Text>
      </View>
      {disputeType === item.id && (
        <Ionicons name="checkmark-circle" size={22} color={item.color} />
      )}
    </TouchableOpacity>
  );

  const OrderCard = ({ item }: { item: Order }) => {
    const isExpanded = expandedOrder === item.id;
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);

    return (
      <Animated.View style={[styles.orderCard]}>
        {/* Header */}
        <TouchableOpacity 
          style={styles.cardHeader}
          onPress={() => setExpandedOrder(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
              <Ionicons name={statusIcon as any} size={14} color="#fff" />
            </View>
            <View>
              <Text style={styles.orderId}>Order #{item.id.slice(-8)}</Text>
              <Text style={styles.orderDate}>{item.order_date}</Text>
            </View>
          </View>
          <View style={styles.cardHeaderRight}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(item.status)}
            </Text>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#8E8E93" 
            />
          </View>
        </TouchableOpacity>

        {/* Product Info (Always visible) */}
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
            <Text style={styles.sellerName}>
              <Ionicons name="storefront-outline" size={12} color="#8E8E93" /> {item.seller.name}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatCurrency(item.total)}</Text>
              <Text style={styles.quantity}>Qty: {item.quantity}</Text>
            </View>
          </View>
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <Animated.View style={styles.expandedContent}>
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color="#8E8E93" />
                <Text style={styles.detailLabel}>Shipping Address:</Text>
                <Text style={styles.detailValue}>{item.shipping_address}</Text>
              </View>
              
              {item.hasDelivery && (
                <>
                  <View style={styles.detailRow}>
                    <Ionicons name="bicycle-outline" size={16} color="#8E8E93" />
                    <Text style={styles.detailLabel}>Delivery Status:</Text>
                    <View style={[styles.deliveryBadge, { backgroundColor: getStatusColor(item.delivery_status || 'pending') + '20' }]}>
                      <Text style={[styles.deliveryBadgeText, { color: getStatusColor(item.delivery_status || 'pending') }]}>
                        {getDeliveryStatusText(item.delivery_status)}
                      </Text>
                    </View>
                  </View>
                  
                  {item.delivery_fee && (
                    <View style={styles.detailRow}>
                      <Ionicons name="cash-outline" size={16} color="#8E8E93" />
                      <Text style={styles.detailLabel}>Delivery Fee:</Text>
                      <Text style={styles.detailValue}>{formatCurrency(item.delivery_fee)}</Text>
                    </View>
                  )}
                  
                  {item.tracking_number && (
                    <View style={styles.detailRow}>
                      <Ionicons name="cube-outline" size={16} color="#8E8E93" />
                      <Text style={styles.detailLabel}>Tracking #:</Text>
                      <Text style={styles.trackingNumber}>{item.tracking_number}</Text>
                    </View>
                  )}
                </>
              )}

              {item.type === 'service' && (
                <View style={styles.detailRow}>
                  <Ionicons name="construct-outline" size={16} color="#8E8E93" />
                  <Text style={styles.detailLabel}>Service Type:</Text>
                  <Text style={styles.detailValue}>Digital Service</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
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
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm Completion</Text>
            </TouchableOpacity>
          )}

          {item.canDispute && item.payment_status !== "paid" && (
            <TouchableOpacity
              style={styles.disputeButton}
              onPress={() => openDisputeModal(item)}
            >
              <Ionicons name="warning-outline" size={18} color="#fff" />
              <Text style={styles.disputeButtonText}>Raise Dispute</Text>
            </TouchableOpacity>
          )}

          {item.payment_status === "disputed" && (
            <View style={styles.disputeInfo}>
              <Ionicons name="time-outline" size={16} color="#FF9500" />
              <Text style={styles.disputeInfoText}>Dispute under admin review</Text>
            </View>
          )}

          {(item.status === "completed" && item.payment_status === "paid") && (
            <View style={styles.completedInfo}>
              <Ionicons name="checkmark-done-circle" size={16} color="#34C759" />
              <Text style={styles.completedInfoText}>Order completed - Payment released</Text>
            </View>
          )}
        </View>
      </Animated.View>
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
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      {orders.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{orders.length}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#FF9500" }]}>
              {orders.filter(o => o.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Processing</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#34C759" }]}>
              {orders.filter(o => o.status === 'delivered').length}
            </Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
        </View>
      )}

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
            <View style={styles.emptyIconContainer}>
              <Ionicons name="document-text-outline" size={60} color="#C7C7CC" />
            </View>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtext}>Your orders will appear here</Text>
            <TouchableOpacity 
              style={styles.shopNowButton}
              onPress={() => router.push('/home/Homescreen')}
            >
              <Text style={styles.shopNowText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={<View style={{ height: 30 }} />}
      />

      {/* Dispute Modal */}
      <Modal
        animationType="slide"
        visible={disputeModalVisible}
        onRequestClose={closeDisputeModal}
        presentationStyle={isIOS ? "pageSheet" : "fullScreen"}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={closeDisputeModal}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Raise a Dispute</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView 
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            {selectedOrder && (
              <View style={styles.orderSummary}>
                <Text style={styles.orderSummaryTitle}>Order #{selectedOrder.id.slice(-8)}</Text>
                <Text style={styles.orderSummaryProduct} numberOfLines={2}>
                  {selectedOrder.product.name}
                </Text>
                <View style={styles.orderSummaryFooter}>
                  <Text style={styles.orderSummaryAmount}>
                    {formatCurrency(selectedOrder.total)}
                  </Text>
                  <View style={[styles.orderSummaryBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                    <Text style={[styles.orderSummaryBadgeText, { color: getStatusColor(selectedOrder.status) }]}>
                      {getStatusText(selectedOrder.status)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>What&apos;s the issue?</Text>
            <Text style={styles.sectionSubtitle}>Select the category that best describes your problem</Text>
            
            <FlatList
              data={DISPUTE_TYPES}
              renderItem={({ item }) => <DisputeTypeItem item={item} />}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              style={styles.disputeTypesList}
            />

            {disputeType && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Tell us more</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Dispute Title</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter a clear title for your dispute"
                    value={disputeTitle}
                    onChangeText={setDisputeTitle}
                    placeholderTextColor="#C7C7CC"
                    maxLength={100}
                  />
                  <Text style={styles.charCount}>{disputeTitle.length}/100</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Detailed Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Describe the issue in detail. Include what happened, when it happened, and any communication with the seller..."
                    value={disputeDescription}
                    onChangeText={setDisputeDescription}
                    placeholderTextColor="#C7C7CC"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    maxLength={1000}
                  />
                  <Text style={styles.charCount}>{disputeDescription.length}/1000</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Evidence (Optional)</Text>
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
                    Upload screenshots, photos, or documents (Max 5 files, 5MB each)
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#007AFF" />
                  <Text style={styles.infoBoxText}>
                    Our team will review your dispute within 2-3 business days. You&apos;ll be notified of any updates.
                  </Text>
                </View>
              </View>
            )}

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
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <ConfirmationModal visible={open} onCancel={modalMessages.onCancel} onConfirm={modalMessages.onclick} message={modalMessages.message} title={modalMessages.title} />
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
  },
  backButton: {
    padding: 4,
  },
  refreshButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  placeholder: {
    width: 32,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E5EA",
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
    color: '#333',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginBottom: 20,
  },
  shopNowButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  shopNowText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8F9FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  orderId: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  orderDate: {
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 2,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  productSection: {
    flexDirection: "row",
    padding: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#F2F2F7',
  },
  noImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 4,
    lineHeight: 20,
  },
  sellerName: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
  },
  quantity: {
    fontSize: 12,
    color: "#8E8E93",
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    backgroundColor: "#F8F9FA",
  },
  detailsSection: {
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: "#8E8E93",
  },
  detailValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  deliveryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  deliveryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  trackingNumber: {
    fontSize: 13,
    color: "#007AFF",
    fontFamily: isIOS ? 'Courier' : 'monospace',
    fontWeight: "500",
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#34C759",
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  disputeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    borderRadius: 12,
  },
  disputeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  disputeInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF3E0",
    paddingVertical: 12,
    borderRadius: 12,
  },
  disputeInfoText: {
    color: "#FF9500",
    fontSize: 13,
    fontWeight: "500",
  },
  completedInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E8F5E9",
    paddingVertical: 12,
    borderRadius: 12,
  },
  completedInfoText: {
    color: "#2E7D32",
    fontSize: 13,
    fontWeight: "500",
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
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  orderSummaryTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 4,
  },
  orderSummaryProduct: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 10,
    lineHeight: 20,
  },
  orderSummaryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderSummaryAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
  },
  orderSummaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderSummaryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 16,
    lineHeight: 20,
  },
  disputeTypesList: {
    marginBottom: 20,
  },
  disputeTypeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#F2F2F7",
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  disputeTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  disputeTypeContent: {
    flex: 1,
  },
  disputeTypeTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 4,
  },
  disputeTypeDescription: {
    fontSize: 12,
    color: "#8E8E93",
    lineHeight: 16,
  },
  // detailsSection: {
  //   marginTop: 10,
  // },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1D1D1F",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
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
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#BBDEFB",
    borderStyle: "dashed",
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#007AFF",
  },
  uploadHint: {
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 6,
    textAlign: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#E3F2FD",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: "#1565C0",
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F2F2F7",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8E8E93",
  },
  submitButton: {
    backgroundColor: "#FF3B30",
  },
  submitButtonDisabled: {
    backgroundColor: "#FFCDD2",
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});