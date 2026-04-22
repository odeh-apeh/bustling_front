import ConfirmationModal, { useConfirmation } from "@/components/confirmation";
import { useToast } from "@/contexts/toast-content";
import { BASE_URL } from "@/helpers/core-service";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Check if device is iOS
const isIOS = Platform.OS === "ios";

type Product = {
  id: string;
  title: string;
  price: string;
  status: string;
  images: string[] | string;
  created_at: string;
  views: number;
  orders: number;
};

type Order = {
  id: string;
  product_name: string;
  buyer_name: string;
  price: string;
  order_date: string;
  status: string;
};

export default function SellerScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const { showToast, setMarketVisible } = useToast();
  

  // Helper function to extract first image from product
  const getProductImageUrl = (product: Product) => {
    if (!product.images) return null;

    let firstImage = null;

    try {
      // If images is already an array
      if (Array.isArray(product.images) && product.images.length > 0) {
        firstImage = product.images[0];
      }
      // If images is a string
      else if (typeof product.images === "string" && product.images.trim()) {
        // Try to parse as JSON array
        if (product.images.startsWith("[") && product.images.endsWith("]")) {
          const parsed = JSON.parse(product.images);
          if (Array.isArray(parsed) && parsed.length > 0) {
            firstImage = parsed[0];
          }
        } else {
          // Plain string URL
          firstImage = product.images;
        }
      }
    } catch (error) {
      console.error("Error parsing images:", error);
      return null;
    }

    if (!firstImage) return null;

    // Clean the filename
    let filename = String(firstImage);
    filename = filename
      .replace(/\\/g, "")
      .replace(/^["']|["']$/g, "")
      .replace(/^\[|\]$/g, "")
      .trim();

    // If it's already a full URL
    if (filename.startsWith("http://") || filename.startsWith("https://")) {
      return filename;
    }

    // Handle uploads path
    const cleanPath = filename.replace(/^\/+/, "");
    if (cleanPath.includes("uploads/")) {
      return `${BASE_URL}/${cleanPath}`;
    }

    return `${BASE_URL}/uploads/${cleanPath}`;
  };

  // Fetch seller's products
  const fetchMyProducts = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`${BASE_URL}/api/products/my-products`, {
        credentials: "include",
      });

      const data = await response.json();

      console.log("Fetched products:", data.products);

      if (data.success) {
        setProducts(data.products);
        // Reset image errors for new products
        setImageErrors({});
      } else {
        Alert.alert("Error", "Failed to load your products");
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      Alert.alert("Error", "Cannot connect to server");
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch pending orders
  const fetchPendingOrders = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/orders/pending`, {
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    }
  };

  useEffect(() => {
    fetchMyProducts();
    fetchPendingOrders();
  }, []);

  useFocusEffect(
      useCallback(() => {
        const onBackPress = () => {
          // Your custom function here
          setMarketVisible(true);
          router.back();
          // Return true to prevent default behavior, false to allow it
          return true;
        };
        
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        
        return () => {
          subscription.remove();
        };
      }, [])
    );

  const handleUploadProduct = () => {
    router.push("/market/UploadTypeScreen");
  };

  const handleRefresh = () => {
    if (selectedTab === "products") {
      fetchMyProducts();
    } else {
      fetchPendingOrders();
    }
  };

  

  const renderProductItem = ({ item }: { item: Product }) => {
    const imageUrl = getProductImageUrl(item);
    const hasError = imageErrors[item.id];

    return (
              <TouchableOpacity onPress={() => // Passing params
        router.push({
          pathname: "/market/ManageSellScreen",
          params: { 
            id: item.id,
            productTitle: item.title,
            productPrice: item.price,
            productImage: imageUrl,
          }
        })}>
        <View style={styles.productCard}>
          {imageUrl && !hasError ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              onError={(e) => {
                console.log("❌ IMAGE LOAD ERROR:", {
                  url: imageUrl,
                  error: e.nativeEvent.error,
                  productId: item.id,
                  productTitle: item.title,
                });
                setImageErrors((prev) => ({ ...prev, [item.id]: true }));
              }}
              onLoad={() => {
                console.log("✅ IMAGE LOADED:", imageUrl);
              }}
            />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={24} color="#999" />
            </View>
          )}

          <View style={styles.productInfo}>
            <Text style={styles.productTitle}>{item.title}</Text>
            <Text style={styles.productPrice}>
              ₦{parseFloat(item.price).toLocaleString()}
            </Text>

            <View style={styles.productStats}>
              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={12} color="#666" />
                <Text style={styles.statText}>{item.views || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="cart-outline" size={12} color="#666" />
                <Text style={styles.statText}>{item.orders || 0}</Text>
              </View>
            </View>

            <View
              style={[
                styles.statusBadge,
                item.status === "active"
                  ? styles.activeBadge
                  : item.status === "inactive"
                    ? styles.soldBadge
                    : styles.draftBadge,
              ]}
            >
              <Text style={styles.statusText}>
                {item.status === "active"
                  ? "Active"
                  : item.status === "inactive"
                    ? "Inactive"
                    : "Draft"}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderProduct}>{item.product_name}</Text>
        <Text style={styles.orderPrice}>{item.price}</Text>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.buyerName}>Buyer: {item.buyer_name}</Text>
        <Text style={styles.orderDate}>
          Ordered: {new Date(item.order_date).toLocaleDateString()}
        </Text>
      </View>

      <View
        style={[
          styles.orderStatus,
          item.status === "awaiting_delivery"
            ? styles.awaitingDelivery
            : item.status === "payment_held"
              ? styles.paymentHeld
              : styles.completed,
        ]}
      >
        <Text style={styles.orderStatusText}>
          {item.status === "awaiting_delivery"
            ? "Awaiting Delivery"
            : item.status === "payment_held"
              ? "Payment Held in Escrow"
              : "Completed"}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your products...</Text>
      </SafeAreaView>
    );
  }

  // Filter products based on search
  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen
        options={{
          headerShown: false,
          statusBarStyle: "dark",
          statusBarBackgroundColor: "#fff",
        }}
      />

      <View style={styles.innerContainer}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              router.back();
              setMarketVisible(true);
            }}
          >
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Sell</Text>

          <TextInput
            placeholder="Search your products..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Upload Product Section */}
          <View style={styles.uploadSection}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUploadProduct}
            >
              <View style={styles.uploadIcon}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={40}
                  color="#007AFF"
                />
              </View>
              <Text style={styles.uploadText}>Upload New Product</Text>
              <Text style={styles.uploadSubtext}>
                Add photos, description, and pricing
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === "products" && styles.activeTab,
              ]}
              onPress={() => setSelectedTab("products")}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "products" && styles.activeTabText,
                ]}
              >
                My Products ({filteredProducts.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, selectedTab === "orders" && styles.activeTab]}
              onPress={() => setSelectedTab("orders")}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "orders" && styles.activeTabText,
                ]}
              >
                Pending Orders ({orders.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Products Section */}
          {selectedTab === "products" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Products</Text>
              {filteredProducts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="cube-outline" size={50} color="#ccc" />
                  <Text style={styles.emptyStateText}>
                    {searchQuery ? "No matching products" : "No products yet"}
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    {searchQuery
                      ? "Try a different search term"
                      : "Upload your first product to start selling"}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredProducts}
                  renderItem={renderProductItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.productsList}
                />
              )}
            </View>
          )}

          {/* Orders Section */}
          {selectedTab === "orders" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Orders</Text>
              {orders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={50} color="#ccc" />
                  <Text style={styles.emptyStateText}>No pending orders</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Orders will appear here when customers buy your products
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={orders}
                  renderItem={renderOrderItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.ordersList}
                />
              )}
            </View>
          )}

          {/* Bottom padding for safe area */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.push("/market/ManageSellScreen")}
      >
        <Ionicons name="options" size={20} color="#fff" />
      </TouchableOpacity>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  innerContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: isIOS ? 0 : 5,
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: -0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
    fontWeight: "600",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  placeholderImage: {
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  placeholderText: {
    color: "#D1D5DB",
    fontSize: 12,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
    fontSize: 14,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  uploadSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    backgroundColor: "#F0F7FF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  uploadIcon: {
    marginBottom: 12,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 6,
  },
  uploadSubtext: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  activeTab: {
    backgroundColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    color: "#1F2937",
    letterSpacing: -0.3,
  },
  productsList: {
    gap: 12,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    //elevation: 3,
    borderWidth: 1,
    borderColor: "#cacfd3",
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: "#F3F4F6",
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
    color: "#1F2937",
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: "800",
    color: "#007AFF",
    marginBottom: 8,
  },
  productStats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activeBadge: {
    backgroundColor: "#D1FAE5",
  },
  soldBadge: {
    backgroundColor: "#FEF3C7",
  },
  draftBadge: {
    backgroundColor: "#DBEAFE",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1F2937",
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderProduct: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
    marginRight: 10,
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#007AFF",
  },
  orderDetails: {
    marginBottom: 12,
    gap: 4,
  },
  buyerName: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  orderStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  awaitingDelivery: {
    backgroundColor: "#FEF3C7",
  },
  paymentHeld: {
    backgroundColor: "#DBEAFE",
  },
  completed: {
    backgroundColor: "#D1FAE5",
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
  },
  bottomPadding: {
    height: 10,
  },
  floatingButton: {
    position: "absolute",
    bottom: 60,
    right: 20,
    backgroundColor: "#007AFF",
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
