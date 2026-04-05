import React, { useState, useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "@/helpers/core-service";

const { height } = Dimensions.get("window");

type Order = {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  seller_name: string;
  seller_id: string;
  quantity: number;
  total: number;
  status: "pending" | "paid" | "shipped" | "completed" | "cancelled";
  order_date: string;
  shipping_address: string;
  delivery_status?: "pending" | "assigned" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  delivery_company_id?: string;
  delivery_fee?: number;
  type: "product" | "service";
  payment_status: "pending" | "paid" | "failed" | "refunded";
};

// Default fallback image component
const DefaultProductImage = () => (
  <View style={styles.defaultImage}>
    <Ionicons name="image-outline" size={32} color="#ccc" />
    <Text style={styles.defaultImageText}>No Image</Text>
  </View>
);

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch orders from backend
  const fetchOrders = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const userId = await AsyncStorage.getItem("userId");

    try {
      const response = await fetch(`${BASE_URL}/api/orders/buyer/${userId}`, {
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        // Transform backend data - use ONLY database images
        const formattedOrders = data.orders.map((order: any) => ({
          id: order.id.toString(),
          product_id: order.product?.id?.toString() || "",
          product_name: order.product?.name || "Unknown Product",
          product_image: order.product?.image || order.product?.image_url || "",
          seller_name: order.seller?.name || "Unknown Seller",
          seller_id: order.seller?.id?.toString() || "",
          quantity: order.quantity || 1,
          total: order.total || order.total_price,
          status: order.status,
          order_date: order.order_date || order.created_at,
          shipping_address: order.shipping_address,
          delivery_status: order.delivery_status,
          delivery_company_id: order.delivery_company_id,
          delivery_fee: order.delivery_fee,
          type: order.type || "product",
          payment_status: order.payment_status || "pending",
        }));
        
        setOrders(formattedOrders);
      } else {
        Alert.alert("Error", data.message || "Failed to load orders");
      }
    } catch (error) {
      console.error("Fetch orders error:", error);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleMessageSeller = (order: Order) => {
    router.push({
      pathname: "/chat/ChatScreen",
      params: { 
        sellerName: order.seller_name,
        sellerId: order.seller_id,
        productName: order.product_name,
        productPrice: `₦${order.total.toLocaleString()}`,
        orderId: order.id
      }
    });
  };

  const handleRequestDelivery = async (order: Order) => {
    try {
      // First, get available delivery companies
      const companiesResponse = await fetch(
        `${BASE_URL}/api/delivery/companies?orderId=${order.id}`,
        {
          credentials: "include",
        }
      );

      const companiesData = await companiesResponse.json();

      if (companiesData.success && companiesData.nearbyCompanies.length > 0) {
        // Navigate to delivery companies screen
        router.push({
          pathname: "/delivery/DeliveryAgentsScreen",
          params: {
            orderId: order.id,
            productName: order.product_name,
            sellerName: order.seller_name,
            totalAmount: order.total.toString(),
            companies: JSON.stringify(companiesData.nearbyCompanies)
          }
        });
      } else {
        Alert.alert(
          "No Delivery Available",
          "No delivery companies are available in your area at the moment. Please try again later."
        );
      }
    } catch (error) {
      console.error("Request delivery error:", error);
      Alert.alert("Error", "Failed to request delivery");
    }
  };

  const handleViewOrderDetails = (order: Order) => {
    router.push({
      pathname: "/orders/OrderHistoryScreen",
      params: {
        orderId: order.id,
        productName: order.product_name,
        sellerName: order.seller_name,
        amount: order.total.toString(),
        orderDate: order.order_date,
        status: order.status,
        hasDelivery: (!!order.delivery_company_id).toString(),
        deliveryStatus: order.delivery_status || "pending",
        productImage: order.product_image,
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#FF9800";
      case "paid":
        return "#2196F3";
      case "shipped":
        return "#9C27B0";
      case "completed":
        return "#4CAF50";
      case "cancelled":
        return "#FF3B30";
      default:
        return "#666";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending Payment";
      case "paid":
        return "Paid - Awaiting Shipment";
      case "shipped":
        return "Shipped";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const canRequestDelivery = (order: Order) => {
    // Can request delivery if:
    // - Order is paid or shipped (not pending, completed, or cancelled)
    // - No delivery company assigned yet
    // - Payment is successful
    const validStatus = order.status === "paid" || order.status === "shipped";
    const noDeliveryAssigned = !order.delivery_company_id;
    const notFinalStatus = order.status !== "cancelled" && order.status !== "completed";
    const paymentSuccessful = order.payment_status === "paid";
    const isProduct = order.type === "product";

    return validStatus && noDeliveryAssigned && notFinalStatus && paymentSuccessful && isProduct;
  };

  const hasActiveDelivery = (order: Order) => {
    const hasDeliveryCompany = !!order.delivery_company_id;
    const deliveryNotComplete = order.delivery_status !== "delivered" && order.delivery_status !== "cancelled";
    
    return hasDeliveryCompany && deliveryNotComplete;
  };

  const getDeliveryStatusText = (order: Order) => {
    if (!order.delivery_status) return "";
    
    switch (order.delivery_status) {
      case "pending":
        return "Delivery Pending";
      case "assigned":
        return "Delivery Assigned";
      case "picked_up":
        return "Picked Up";
      case "in_transit":
        return "In Transit";
      case "delivered":
        return "Delivered";
      case "cancelled":
        return "Delivery Cancelled";
      default:
        return order.delivery_status;
    }
  };

  const renderProductImage = (order: Order) => {
    // Only show image if it exists in database
    if (order.product_image) {
      return (
        <Image 
          source={{ uri: order.product_image }} 
          style={styles.productImage}
          onError={(e) => console.log(`Image load error for order ${order.id}:`, e.nativeEvent.error)}
        />
      );
    }
    
    // Fallback to default image component
    return <DefaultProductImage />;
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      {/* Product Info */}
      <View style={styles.productSection}>
        {renderProductImage(item)}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.product_name}</Text>
          <Text style={styles.seller}>Seller: {item.seller_name}</Text>
          <Text style={styles.price}>₦{item.total.toLocaleString()}</Text>
          <Text style={styles.quantity}>Qty: {item.quantity}</Text>
          <Text style={styles.orderDate}>
            Ordered: {new Date(item.order_date).toLocaleDateString()}
          </Text>
          
          {/* Payment Status */}
          <View style={[styles.paymentBadge, { 
            backgroundColor: item.payment_status === "paid" ? "#4CAF50" : 
                           item.payment_status === "failed" ? "#FF3B30" : "#FF9800" 
          }]}>
            <Text style={styles.paymentStatusText}>
              Payment: {item.payment_status.toUpperCase()}
            </Text>
          </View>

          {/* Order Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>

          {/* Delivery Status */}
          {hasActiveDelivery(item) && (
            <View style={[styles.deliveryBadge, { backgroundColor: "#2196F3" }]}>
              <Ionicons name="car-outline" size={12} color="#fff" />
              <Text style={styles.deliveryStatusText}>
                {getDeliveryStatusText(item)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.messageButton}
          onPress={() => handleMessageSeller(item)}
        >
          <Ionicons name="chatbubble-outline" size={16} color="#007AFF" />
          <Text style={styles.messageButtonText}>Message Seller</Text>
        </TouchableOpacity>

        {canRequestDelivery(item) && (
          <TouchableOpacity 
            style={styles.deliveryButton}
            onPress={() => handleRequestDelivery(item)}
          >
            <Ionicons name="car-outline" size={16} color="#fff" />
            <Text style={styles.deliveryButtonText}>Request Delivery</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => handleViewOrderDetails(item)}
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order History</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color="#007AFF" />
        <Text style={styles.infoText}>
          Your recent orders. Request delivery or message sellers directly.
        </Text>
      </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item: Order) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrders(true)}
            colors={["#007AFF"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubtext}>
              Your order history will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: height * 0.06,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    marginLeft: 5,
    fontSize: 16,
    color: "#000",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 70,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 15,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 8,
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: "#007AFF",
    fontSize: 14,
    lineHeight: 18,
  },
  listContent: {
    padding: 15,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: "#f8f9ff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  productSection: {
    flexDirection: "row",
    marginBottom: 15,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: "#f5f5f5",
  },
  defaultImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  defaultImageText: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#000",
  },
  seller: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 2,
  },
  quantity: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: "#999",
    marginBottom: 6,
  },
  paymentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  paymentStatusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  deliveryBadge: {
    flexDirection: "row",
    alignSelf: 'flex-start',
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  deliveryStatusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    flexWrap: 'wrap',
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: 120,
  },
  messageButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  deliveryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: 140,
  },
  deliveryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  detailsButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
  },
  detailsButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});