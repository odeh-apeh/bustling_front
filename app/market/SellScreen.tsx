import React, { useState, useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  TextInput,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";

const { width } = Dimensions.get("window");

// Check if device is iOS
const isIOS = Platform.OS === 'ios';

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

  // Fetch seller's products
 const fetchMyProducts = async () => {
  try {
    setRefreshing(true);
    const response = await fetch(`${BASE_URL}/api/products/my-products`, {
      credentials: 'include',
    });
    
    const data = await response.json();
    
    console.log('📦 My Products RAW API Response:', {
      success: data.success,
      productCount: data.products?.length,
      firstProductRaw: data.products?.[0],
      // Stringify to see all properties
      firstProductStringified: JSON.stringify(data.products?.[0], null, 2)
    });
    
    if (data.success) {
      setProducts(data.products);
    } else {
      Alert.alert("Error", "Failed to load your products");
      setProducts([]);
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    Alert.alert("Error", "Cannot connect to server");
    setProducts([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

useEffect(() => {
  if (products.length > 0) {
    console.log('📊 Products Image Analysis:');
    products.forEach((product, index) => {
      console.log(`Product ${index + 1}:`, {
        id: product.id,
        title: product.title,
        hasImages: product.images && product.images.length > 0,
        imageCount: product.images?.length || 0,
        images: product.images
      });
    });
    
    // Count how many have images
    const withImages = products.filter(p => p.images && p.images.length > 0).length;
    console.log(`📸 ${withImages}/${products.length} products have images`);
  }
}, [products]);

  // Fetch pending orders
  const fetchPendingOrders = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/orders/pending`, {
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    }
  };

  useEffect(() => {
    fetchMyProducts();
    fetchPendingOrders();
  }, []);

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
  // Get first image - FIXED VERSION
  const getFirstImage = () => {
    console.log('🔍 Product images data:', {
      id: item.id,
      title: item.title,
      rawImages: item.images,
      imagesType: typeof item.images,
      isArray: Array.isArray(item.images),
      length: item.images?.length
    });
    
    if (!item.images) {
      console.log('❌ No images field');
      return null;
    }
    
    // If images is already an array
    if (Array.isArray(item.images) && item.images.length > 0) {
      const firstImage = item.images[0];
      console.log('✅ First image from array:', firstImage);
      return firstImage;
    }
    
    // If images is a string (JSON string)
    if (typeof item.images === 'string' && item.images.trim()) {
      try {
        const parsed = JSON.parse(item.images);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstImage = parsed[0];
          console.log('✅ First image from parsed JSON:', firstImage);
          return firstImage;
        }
      } catch (e) {
        console.log('❌ Failed to parse images string:', e);
        // If it's just a plain string (not JSON), use it directly
        return item.images;
      }
    }
    
    console.log('❌ No valid image found');
    return null;
  };

  const firstImage = getFirstImage();
  
  // Construct the URL - FIXED
  const getImageUrl = () => {
    if (!firstImage) return null;
    
    // Clean the filename
    let filename = firstImage;
    
    // Remove any quotes or backslashes
    filename = filename.replace(/\\/g, '')
                       .replace(/^["']|["']$/g, '')
                       .trim();
    
    // Check if it already has "uploads/" prefix
    if (filename.includes('uploads/')) {
      return `${BASE_URL}/${filename}`;
    }

    return `${BASE_URL}/uploads/${filename}`;
  };

  const imageUrl = getImageUrl();
  
  console.log('🎯 Final image URL:', {
    firstImage,
    imageUrl,
    productId: item.id,
    productTitle: item.title
  });

  return (
    <View style={styles.productCard}>
      {imageUrl ? (
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.productImage} 
          onError={(e) => {
            console.log('❌ IMAGE LOAD ERROR:', {
              url: imageUrl,
              error: e.nativeEvent.error,
              productId: item.id
            });
          }}
          onLoad={() => {
            console.log('✅ IMAGE LOADED SUCCESSFULLY:', imageUrl);
          }}
        />
      ) : (
        <View style={[styles.productImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={24} color="#999" />
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      
      <View style={styles.productInfo}>
        <Text style={styles.productTitle}>{item.title}</Text>
        <Text style={styles.productPrice}>₦{parseFloat(item.price).toLocaleString()}</Text>
        
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
        
        <View style={[styles.statusBadge, 
          item.status === 'active' ? styles.activeBadge : 
          item.status === 'sold' ? styles.soldBadge : styles.draftBadge
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'active' ? 'Active' : 
             item.status === 'sold' ? 'Sold' : 'Draft'}
          </Text>
        </View>
      </View>
    </View>
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
        <Text style={styles.orderDate}>Ordered: {new Date(item.order_date).toLocaleDateString()}</Text>
      </View>
      
      <View style={[
        styles.orderStatus,
        item.status === 'awaiting_delivery' ? styles.awaitingDelivery :
        item.status === 'payment_held' ? styles.paymentHeld : styles.completed
      ]}>
        <Text style={styles.orderStatusText}>
          {item.status === 'awaiting_delivery' ? 'Awaiting Delivery' :
           item.status === 'payment_held' ? 'Payment Held in Escrow' : 'Completed'}
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ 
        headerShown: false,
        statusBarStyle: 'dark',
        statusBarBackgroundColor: '#fff',
      }} />
      
      <View style={styles.innerContainer}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Sell</Text>

          <TextInput
            placeholder="Search your products..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
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
                <Ionicons name="cloud-upload-outline" size={40} color="#007AFF" />
              </View>
              <Text style={styles.uploadText}>Upload New Product</Text>
              <Text style={styles.uploadSubtext}>Add photos, description, and pricing</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, selectedTab === "products" && styles.activeTab]}
              onPress={() => setSelectedTab("products")}
            >
              <Text style={[styles.tabText, selectedTab === "products" && styles.activeTabText]}>
                My Products ({products.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, selectedTab === "orders" && styles.activeTab]}
              onPress={() => setSelectedTab("orders")}
            >
              <Text style={[styles.tabText, selectedTab === "orders" && styles.activeTabText]}>
                Pending Orders ({orders.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Products Section */}
          {selectedTab === "products" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Products</Text>
              {products.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="cube-outline" size={50} color="#ccc" />
                  <Text style={styles.emptyStateText}>No products yet</Text>
                  <Text style={styles.emptyStateSubtext}>Upload your first product to start selling</Text>
                </View>
              ) : (
                <FlatList
                  data={products}
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
                  <Text style={styles.emptyStateSubtext}>Orders will appear here when customers buy your products</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff",
  },
  innerContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: isIOS ? 0 : 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 10,
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 20,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    fontSize: 14,
  },
  uploadSection: {
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 20,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 25,
    alignItems: "center",
    backgroundColor: "#f8f9ff",
  },
  uploadIcon: {
    marginBottom: 10,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 5,
  },
  uploadSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#111",
  },
  productsList: {
    gap: 12,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#f8f9ff",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#000",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 8,
  },
  productStats: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#666",
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: "#e8f5e8",
  },
  soldBadge: {
    backgroundColor: "#fff3cd",
  },
  draftBadge: {
    backgroundColor: "#e3f2fd",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: '#333',
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: "#f8f9ff",
    padding: 15,
    borderRadius: 10,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderProduct: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
    marginRight: 10,
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
  },
  orderDetails: {
    marginBottom: 10,
  },
  buyerName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: "#999",
  },
  orderStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  awaitingDelivery: {
    backgroundColor: "#fff3cd",
  },
  paymentHeld: {
    backgroundColor: "#e3f2fd",
  },
  completed: {
    backgroundColor: "#e8f5e8",
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  bottomPadding: {
    height: 30,
  },
});