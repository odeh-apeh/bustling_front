import React, { useState, useRef, useEffect } from "react";
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
  Animated,
  Easing,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { BASE_URL } from "@/helpers/core-service";

const { height } = Dimensions.get("window");

// Check if device is iOS
const isIOS = Platform.OS === 'ios';

const COLORS = {
  primary: '#0066CC', // Deeper blue
  primaryLight: '#E6F2FF',
  secondary: '#4CAF50',
  accent: '#FF9800',
  background: '#F8FAFC', // Slightly off-white background
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#666666',
  border: '#E1E8F0',
};

export default function BuyScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<"product" | "service">("product");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isMarketVisible, setMarketVisible] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Check if user is logged in by calling chat token endpoint
  const checkIfLoggedIn = async (): Promise<boolean> => {
    try {
      setCheckingAuth(true);
      const response = await fetch(`${BASE_URL}/api/chat/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // This sends the session cookie
      });
      
      if (response.ok) {
        console.log("✅ User is logged in (session valid)");
        return true;
      } else {
        console.log("❌ User is NOT logged in");
        return false;
      }
    } catch (error) {
      console.error("Auth check error:", error);
      return false;
    } finally {
      setCheckingAuth(false);
    }
  };

  // Fetch categories from API
  const fetchCategories = async (type: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/products/categories?type=${type}`);
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
      } else {
        const fallbackCategories = type === 'service' 
          ? ['All', 'Home Services', 'Professional Services', 'Beauty & Wellness', 'Creative Services', 'Tech Services', 'Others']
          : ['All', 'Groceries and Food', 'Health and Wellness', 'Fashion and Apparel', 'Electronics and Gadgets', 'Beauty and Personal Care', 'Others'];
        setCategories(fallbackCategories);
      }
    } catch (error) {
      const fallbackCategories = selectedType === 'service' 
        ? ['All', 'Home Services', 'Professional Services', 'Beauty & Wellness', 'Creative Services', 'Tech Services', 'Others']
        : ['All', 'Groceries and Food', 'Health and Wellness', 'Fashion and Apparel', 'Electronics and Gadgets', 'Beauty and Personal Care', 'Others'];
      setCategories(fallbackCategories);
    }
  };

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        type: selectedType,
        ...(selectedCategory !== 'All' && { category: selectedCategory }),
        ...(searchQuery && { search: searchQuery })
      });

      console.log("🔄 Fetching products...");
      
      const response = await fetch(`${BASE_URL}/api/products?${params}`);
      const data = await response.json();
      
      console.log("📦 API Response:", {
        success: data.success,
        productCount: data.products?.length
      });
      
      if (data.success && data.products) {
        // Debug: Show first product structure
        if (data.products.length > 0) {
          console.log("🔍 First product fields:", Object.keys(data.products[0]));
          console.log("🔍 First product data:", data.products[0]);
        }
        
        setProducts(data.products);
      } else {
        console.log("❌ API Error:", data.message);
        Alert.alert("Error", "Failed to load products");
        setProducts([]);
      }
    } catch (error) {
      console.error('💥 Fetch error:', error);
      Alert.alert("Error", "Cannot connect to server");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories(selectedType);
  }, [selectedType]);

  useEffect(() => {
    fetchProducts();
  }, [selectedType, selectedCategory, searchQuery]);

  // Toggle Market Modal
  const toggleMarket = () => {
    const toValue = isMarketVisible ? 0 : 1;
    setMarketVisible(!isMarketVisible);

    Animated.timing(slideAnim, {
      toValue,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handleMarketAction = (path: string) => {
    toggleMarket();
    router.push(path as any);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  // Handle message button click
  const handleMessageClick = async (item: any) => {
    // Check if user is logged in
    const isLoggedIn = await checkIfLoggedIn();
    
    if (!isLoggedIn) {
      Alert.alert(
        "Login Required",
        "Please log in to message the seller",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => router.push("/login/LoginScreen") }
        ]
      );
      return;
    }
    
    // Get correct field names with fallbacks
    const productName = item.title || item.name || item.product_name || "Product";
    const sellerName = item.seller || item.seller_name || item.vendor || 
                       item.user?.name || item.User?.name || "Seller";
    const sellerId = item.seller_id || item.user_id || item.user?.id || item.User?.id;
    
    if (!sellerId) {
      Alert.alert("Error", "Cannot message: Seller ID not found");
      return;
    }
    
    // User is logged in, proceed to chat
    router.push({
      pathname: "/chat/ChatScreen",
      params: { 
        sellerId: sellerId, 
        sellerName: sellerName,
        productId: item.id,
        productName: productName,
        productPrice: item.price || 0,
      },
    });
  };

  // Render item function
  const renderItem = ({ item }: { item: any }) => {
    // Get correct field names with fallbacks
    const productName = item.name || item.title || item.product_name || "Product";
    const sellerName = item.seller_name || item.seller || item.vendor || 
                       item.user?.name || item.User?.name || "Seller";
    const location = item.seller_location || item.location || item.user?.location || item.User?.location || "Unknown";
    const price = item.price || item.product_price || 0;

    return (
      <View style={styles.card}>
        {item.images && item.images.length > 0 ? (
          <Image 
            source={{ uri: `${BASE_URL}/uploads/${item.images[0]}` }} 
            style={styles.cardImage} 
          />
        ) : (
          <View style={[styles.cardImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        <Text style={styles.itemTitle}>{productName}</Text>
        <Text style={styles.sellerText}>Seller: {sellerName}</Text>
        <Text style={styles.locationText}>Location: {location}</Text>

        {/* Show service-specific info only for services */}
        {item.type === "service" && (
          <View style={styles.serviceExtraInfo}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating || 'New'}</Text>
            </View>
            <Text style={styles.serviceTypeText}>{item.category}</Text>
          </View>
        )}

        <Text style={styles.price}>₦{parseFloat(price).toLocaleString()}</Text>

        <View style={styles.cardButtons}>
          <TouchableOpacity 
            style={styles.msgBtn}
            onPress={() => handleMessageClick(item)}
            disabled={checkingAuth}
          >
            <Text style={styles.msgBtnText}>
              {checkingAuth ? "..." : "Message"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.orderBtn}
            onPress={() => {
              if (item.type === "service") {
                router.push({
                  pathname: "/market/ServiceDetailsScreen",
                  params: { 
                    serviceId: item.id,
                    serviceName: productName,
                    sellerName: sellerName,
                    price: price,
                    serviceType: item.category,
        // Add image URL if available
                    ...(item.images && item.images.length > 0 && { 
                    imageUri: `${BASE_URL}/uploads/${item.images[0]}` }),
                    description: item.description || "",
        experience: item.experience || "",
        rating: item.rating || "0.0",
        location: location,
        pricingType: item.pricing_type || "fixed",
                  },
                });
              } else {
                router.push({
                  pathname: "/market/OrderScreen",
                  params: { 
                    productId: item.id,
                    productName: productName,
                    sellerName: sellerName,
                    price: price,
                    productType: item.category,
                    ...(item.images && item.images.length > 0 && {
                      imageUri: `${BASE_URL}/uploads/${item.images[0]}`,
                    }),
                  },
                });
              }
            }}
          >
            <Text style={styles.orderBtnText}>
              {item.type === "service" ? "Book" : "Order"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ 
        headerShown: false,
        statusBarStyle: 'dark',
        statusBarBackgroundColor: '#fff',
      }} />
      
      <View style={styles.innerContainer}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Buy</Text>

          <TextInput
            placeholder={selectedType === "product" ? "Search for products" : "Search for services"}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {/* Toggle Buttons */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, selectedType === "product" && styles.activeToggle]}
            onPress={() => {
              setSelectedType("product");
              setSelectedCategory("All");
            }}
          >
            <Text style={[styles.toggleText, selectedType === "product" && styles.activeToggleText]}>
              Products
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, selectedType === "service" && styles.activeToggle]}
            onPress={() => {
              setSelectedType("service");
              setSelectedCategory("All");
            }}
          >
            <Text style={[styles.toggleText, selectedType === "service" && styles.activeToggleText]}>
              Services
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                selectedCategory === cat && styles.activeCategory,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.activeCategoryText,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading {selectedType}s...</Text>
          </View>
        ) : (
          /* Product/Service Cards */
          <FlatList
            data={products}
            numColumns={2}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.flatListContent}
            columnWrapperStyle={styles.columnWrapper}
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No {selectedType}s found{selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
                </Text>
              </View>
            }
          />
        )}

        {/* Bottom Navigation */}
                  {isIOS ? (
                    <BlurView intensity={90} style={styles.bottomNavWrapper}>
                      <View style={styles.bottomNav}>
                        <TouchableOpacity style={styles.bottomNavButton} onPress={() => router.push("/home/Homescreen")}>
                          <Ionicons name="home" size={24} color={COLORS.primary} />
                          <Text style={[styles.bottomNavText, { color: COLORS.primary }]}>Home</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.bottomNavButton} onPress={toggleMarket}>
                          <Ionicons name="cart-outline" size={24} color={isMarketVisible ? COLORS.primary : COLORS.textLight} />
                          <Text style={[styles.bottomNavText, { color: isMarketVisible ? COLORS.primary : COLORS.textLight }]}>
                            Market
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.bottomNavButton}
                          onPress={() => router.push("/orders/OrderHistoryScreen")}
                        >
                          <Ionicons name="list" size={24} color={COLORS.textLight} />
                          <Text style={[styles.bottomNavText, { color: COLORS.textLight }]}>Orders</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.bottomNavButton}
                          onPress={() => router.push("/messages/MessagesScreen")}
                        >
                          <Ionicons name="chatbubble-outline" size={24} color={COLORS.textLight} />
                          <Text style={[styles.bottomNavText, { color: COLORS.textLight }]}>Messages</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.bottomNavButton}
                          onPress={() => router.push("/profile/ProfileScreen")}
                        >
                          <Ionicons name="person-outline" size={24} color={COLORS.textLight} />
                          <Text style={[styles.bottomNavText, { color: COLORS.textLight }]}>Profile</Text>
                        </TouchableOpacity>
                      </View>
                    </BlurView>
                  ) : (
                    <SafeAreaView edges={['bottom']} style={styles.bottomNavWrapper}>
                      <View style={styles.bottomNav}>
                        <TouchableOpacity style={styles.bottomNavButton}>
                          <Ionicons name="home" size={24} color={COLORS.primary} />
                          <Text style={[styles.bottomNavText, { color: COLORS.primary }]}>Home</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.bottomNavButton} onPress={toggleMarket}>
                          <Ionicons name="cart-outline" size={24} color={isMarketVisible ? COLORS.primary : COLORS.textLight} />
                          <Text style={[styles.bottomNavText, { color: isMarketVisible ? COLORS.primary : COLORS.textLight }]}>
                            Market
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.bottomNavButton}
                          onPress={() => router.push("/orders/OrderHistoryScreen")}
                        >
                          <Ionicons name="list" size={24} color={COLORS.textLight} />
                          <Text style={[styles.bottomNavText, { color: COLORS.textLight }]}>Orders</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.bottomNavButton}
                          onPress={() => router.push("/messages/MessagesScreen")}
                        >
                          <Ionicons name="chatbubble-outline" size={24} color={COLORS.textLight} />
                          <Text style={[styles.bottomNavText, { color: COLORS.textLight }]}>Messages</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.bottomNavButton}
                          onPress={() => router.push("/profile/ProfileScreen")}
                        >
                          <Ionicons name="person-outline" size={24} color={COLORS.textLight} />
                          <Text style={[styles.bottomNavText, { color: COLORS.textLight }]}>Profile</Text>
                        </TouchableOpacity>
                      </View>
                    </SafeAreaView>
                  )}
        
        
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
    position: 'relative',
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

  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 5,
    paddingHorizontal: 10,
  },
  toggleButton: {
    width: "40%",
    borderWidth: 1,
    borderColor: "#007AFF",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  toggleText: { 
    color: "#007AFF", 
    fontWeight: "600",
    fontSize: 14,
  },
  activeToggle: { 
    backgroundColor: "#007AFF" 
  },
  activeToggleText: { 
    color: "#fff" 
  },

  categoryScroll: {
    marginTop: 12,
    marginBottom: 5,
    paddingHorizontal: 10,
  },
  categoryScrollContent: {
    paddingRight: 10,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 32,
    paddingVertical: 1,
    marginRight: 8,
    backgroundColor: '#f8f8f8',
  },
  activeCategory: { 
    backgroundColor: "#007AFF", 
    borderColor: "#007AFF" 
  },
  categoryText: { 
    fontSize: 13, 
    color: "#555",
    fontWeight: '500',
  },
  activeCategoryText: { 
    color: "#fff",
    fontWeight: '600',
  },

  flatListContent: { 
    paddingBottom: 100,
    paddingTop: 5,
    paddingHorizontal: 5,
  },
  columnWrapper: { 
    justifyContent: "space-between", 
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  
  card: {
    backgroundColor: "#fafafa",
    width: "48%",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 110,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemTitle: { 
    fontWeight: "600", 
    fontSize: 14, 
    marginBottom: 4,
    color: '#333',
  },
  sellerText: { 
    fontSize: 12, 
    color: "#666",
    marginBottom: 2,
  },
  locationText: { 
    fontSize: 12, 
    color: "#888", 
    marginBottom: 6 
  },
  price: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#007AFF",
    marginBottom: 8,
  },

  // Service-specific styles
  serviceExtraInfo: {
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 11,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  serviceTypeText: {
    fontSize: 11,
    color: "#007AFF",
    fontWeight: "500",
    backgroundColor: '#e6f2ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },

  cardButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  msgBtn: {
    borderWidth: 1,
    borderColor: "#007AFF",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  msgBtnText: { 
    color: "#007AFF", 
    fontSize: 12,
    fontWeight: '600',
  },

  orderBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  orderBtnText: { 
    color: "#fff", 
    fontSize: 12,
    fontWeight: '600',
  },

   bottomNavWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: isIOS ? 'transparent' : COLORS.white,
    borderTopWidth: isIOS ? 0 : 1,
    borderTopColor: COLORS.border,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: isIOS ? 24 : 10,
    backgroundColor: isIOS ? 'rgba(255,255,255,0.9)' : COLORS.white,
  },
  bottomNavButton: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  bottomNavText: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 3,
  },
  
  marketModalContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
    backgroundColor: "#fff",
  },
  marketModal: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  marketContent: { 
    alignItems: "center", 
    width: "100%", 
    marginTop: -20,
    paddingVertical: 20,
  },
  marketBtn: {
    width: "70%",
    paddingVertical: 14,
    backgroundColor: "#007AFF",
    marginVertical: 6,
    borderRadius: 10,
    alignItems: "center",
  },
  marketBtnText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600" 
  },
  closeText: { 
    color: "#007AFF", 
    marginTop: 15, 
    fontWeight: "600",
    fontSize: 16,
  },
  deliveryAgentBtn: {
    width: '70%',
    paddingVertical: 14,
    backgroundColor: '#4CAF50',
    marginVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  deliveryAgentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
  },
});