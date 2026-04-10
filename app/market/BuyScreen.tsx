import React, { useState, useRef, useEffect, useCallback } from "react";
import { Stack, useFocusEffect, useRouter } from "expo-router";
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
  Linking,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { BASE_URL, CoreService } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";
import { openDialer } from "@/helpers/misc";

const { height } = Dimensions.get("window");

// Check if device is iOS
const isIOS = Platform.OS === 'ios';

const COLORS = {
  primary: '#0F4A7A',
  primaryLight: '#E6F2FF',
  secondary: '#4CAF50',
  accent: '#FF9800',
  background: '#F8FAFC',
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#666666',
  border: '#E1E8F0',
};

// Category type definition
interface Category {
  id: number | null;
  name: string;
}

export default function BuyScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<"product" | "service">("product");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  //const [isMarketVisible, setMarketVisible] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { showToast, setMarketVisible, isMarketVisible } = useToast();
  const [sellersPhone, setSellersPhone] = useState<string>('');
  const service: CoreService = new CoreService();

  // Check if user is logged in
  const checkIfLoggedIn = async (): Promise<boolean> => {
    try {
      setCheckingAuth(true);
      const response = await fetch(`${BASE_URL}/api/chat/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      } else {
        const fallbackCategories: Category[] = type === 'service' 
          ? [
              { id: null, name: 'All' },
              { id: 1, name: 'Home Services' },
              { id: 2, name: 'Professional Services' },
              { id: 3, name: 'Beauty & Wellness' },
              { id: 4, name: 'Creative Services' },
              { id: 5, name: 'Tech Services' },
              { id: 6, name: 'Others' }
            ]
          : [
              { id: null, name: 'All' },
              { id: 1, name: 'Groceries and Food' },
              { id: 2, name: 'Health and Wellness' },
              { id: 3, name: 'Fashion and Apparel' },
              { id: 4, name: 'Electronics and Gadgets' },
              { id: 5, name: 'Beauty and Personal Care' },
              { id: 6, name: 'Automotive and Accessories' },
              { id: 7, name: 'Others' }
            ];
        setCategories(fallbackCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      const fallbackCategories: Category[] = selectedType === 'service' 
        ? [
            { id: null, name: 'All' },
            { id: 1, name: 'Home Services' },
            { id: 2, name: 'Professional Services' },
            { id: 3, name: 'Beauty & Wellness' },
            { id: 4, name: 'Creative Services' },
            { id: 5, name: 'Tech Services' },
            { id: 6, name: 'Others' }
          ]
        : [
            { id: null, name: 'All' },
            { id: 1, name: 'Groceries and Food' },
            { id: 2, name: 'Health and Wellness' },
            { id: 3, name: 'Fashion and Apparel' },
            { id: 4, name: 'Electronics and Gadgets' },
            { id: 5, name: 'Beauty and Personal Care' },
            { id: 6, name: 'Automotive and Accessories' },
            { id: 7, name: 'Others' }
          ];
      setCategories(fallbackCategories);
    }
  };

  const getSellersPhone = async(currentProduct:any) => {
    const seller_id = currentProduct.find((item:any) => item.seller_id)?.seller_id;
    if(!seller_id){
      return;
    }
    try{
      const res = await service.get(`/api/products/seller/${seller_id}/phone`);
      if(res.success){
        setSellersPhone(res.data.phone);
      }else{
        //showToast(res.message,'error');
      }
    }catch(e:any){
      showToast(e.message,'error');
    }
  }

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("type", selectedType);

      if (selectedCategoryId !== null && selectedCategoryId !== 0) {
        params.append("category", String(selectedCategoryId));
      }

      if (searchQuery && searchQuery.trim() !== "") {
        params.append("search", searchQuery.trim());
      }

      const url = `${BASE_URL}/api/products?${params.toString()}`;
      console.log("🔄 Fetching products from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      console.log("📡 Response status:", response.status);

      const data = await response.json();

      console.log("📦 API Response:", {
        success: data.success,
        productCount: data.products?.length,
      });

      if (data.success && Array.isArray(data.products)) {
        if (data.products.length > 0) {
          console.log("🔍 First product:", data.products[0]);
        }
        setProducts(data.products);
        await getSellersPhone(data.products);
      } else {
        console.log("❌ API Error:", data.message);
        Alert.alert("Error", data.message || "Failed to load products");
        setProducts([]);
      }
    } catch (error: any) {
      console.error("💥 Fetch error:", error);
      Alert.alert("Error", error.message || "Cannot connect to server");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories when type changes
  useEffect(() => {
    fetchCategories(selectedType);
    setSelectedCategoryId(null);
  }, [selectedType]);

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts();
  }, [selectedType, selectedCategoryId, searchQuery]);

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
    
    const productName = item.title || item.name || item.product_name || "Product";
    const sellerName = item.seller || item.seller_name || item.vendor || 
                       item.user?.name || item.User?.name || "Seller";
    const sellerId = item.seller_id || item.user_id || item.user?.id || item.User?.id;
    
    if (!sellerId) {
      showToast("Cannot message: Seller ID not found",'error');
      return;
    }
    
    openDialer({phoneNumber:sellersPhone, onError:(err) => showToast(err,'error')});
  };

  const directToWhatsapp = (item: any) => {
    const whatsappUrl = `https://wa.me/${sellersPhone}`;
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert("Error", "Cannot open WhatsApp");
    });
  };

  // Enhanced render item function with better card design
  const renderItem = ({ item }: { item: any }) => {
    const productName = item.name || item.title || item.product_name || "Product";
    const sellerName = item.seller_name || item.seller || item.vendor || 
                       item.user?.name || item.User?.name || "Seller";
    const location = item.seller_location || item.location || item.user?.location || item.User?.location || "Unknown";
    const price = parseFloat(item.price || item.product_price || 0);
    const rating = item.rating || (Math.random() * 1.5 + 3.5).toFixed(1);
    const reviewCount = Math.floor(Math.random() * 100) + 10;

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => {
          if (item.type === "service") {
            router.push({
              pathname: "/market/ServiceDetailsScreen",
              params: { 
                serviceId: String(item.id),
                serviceName: productName,
                sellerName: sellerName,
                price: String(price),
                serviceType: item.category_name || "Service",
                ...(item.images && item.images.length > 0 && { 
                  imageUri: `${BASE_URL}/uploads/${item.images[0]}`
                }),
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
                productId: String(item.id),
                productName: productName,
                sellerName: sellerName,
                price: String(price),
                productType: item.category_name || "Product",
                ...(item.images && item.images.length > 0 && {
                  imageUri: `${BASE_URL}/uploads/${item.images[0]}`,
                }),
              },
            });
          }
        }}
      >
        <View style={styles.cardImageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image 
              source={{ uri: `${BASE_URL}/uploads/${item.images[0]}` }} 
              style={styles.cardImage} 
            />
          ) : (
            <View style={[styles.cardImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={32} color="#ccc" />
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          
          {/* Favorite Button */}
          <TouchableOpacity style={styles.favoriteButton}>
            <Ionicons name="heart-outline" size={18} color="#666" />
          </TouchableOpacity>
          
          {/* Badge */}
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, item.type === 'service' && styles.serviceBadge]}>
              <Text style={styles.badgeText}>
                {item.type === 'service' ? 'Service' : 'Product'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.itemTitle} numberOfLines={1}>{productName}</Text>
          
          <View style={styles.sellerRow}>
            <Ionicons name="person-outline" size={12} color="#666" />
            <Text style={styles.sellerText} numberOfLines={1}>{sellerName}</Text>
          </View>
          
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={10} color="#999" />
            <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
          </View>

          {item.type === "service" && (
            <View style={styles.serviceExtraInfo}>
              <View style={styles.ratingContainer}>
                <View style={styles.starsContainer}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Ionicons name="star-half" size={12} color="#FFD700" />
                </View>
                <Text style={styles.ratingText}>{rating}</Text>
                <Text style={styles.reviewCount}>({reviewCount})</Text>
              </View>
              <View style={styles.serviceTypeContainer}>
                <Text style={styles.serviceTypeText}>{item.category_name || 'Service'}</Text>
              </View>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.price}>₦{price.toLocaleString()}</Text>
            {price > 50000 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-10%</Text>
              </View>
            )}
          </View>

          <View style={styles.cardButtons}>
            <TouchableOpacity 
              style={styles.msgBtn}
              onPress={() => handleMessageClick(item)}
              disabled={checkingAuth}
            >
              <Ionicons name="call-outline" size={14} color="#007AFF" />
              <Text style={styles.msgBtnText}>
                {checkingAuth ? "..." : "Call"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.orderBtn}
              onPress={() => {
                if (item.type === "service") {
                  router.push({
                    pathname: "/market/ServiceDetailsScreen",
                    params: { 
                      serviceId: String(item.id),
                      serviceName: productName,
                      sellerName: sellerName,
                      price: String(price),
                      serviceType: item.category_name || "Service",
                      ...(item.images && item.images.length > 0 && { 
                        imageUri: `${BASE_URL}/uploads/${item.images[0]}`
                      }),
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
                      productId: String(item.id),
                      productName: productName,
                      sellerName: sellerName,
                      price: String(price),
                      productType: item.category_name || "Product",
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
            
            <TouchableOpacity 
              style={styles.msgBtn}
              onPress={() => directToWhatsapp(item)}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
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
          <TouchableOpacity onPress={() => 
            {
              router.back();
              setMarketVisible(true);
              
          }} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Marketplace</Text>

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#999" style={styles.searchIcon} />
            <TextInput
              placeholder={selectedType === "product" ? "Search products..." : "Search services..."}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Toggle Buttons */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, selectedType === "product" && styles.activeToggle]}
            onPress={() => {
              setSelectedType("product");
              setSelectedCategoryId(null);
            }}
          >
            <Ionicons name="cube-outline" size={18} color={selectedType === "product" ? "#fff" : "#007AFF"} />
            <Text style={[styles.toggleText, selectedType === "product" && styles.activeToggleText]}>
              Products
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, selectedType === "service" && styles.activeToggle]}
            onPress={() => {
              setSelectedType("service");
              setSelectedCategoryId(null);
            }}
          >
            <Ionicons name="construct-outline" size={18} color={selectedType === "service" ? "#fff" : "#007AFF"} />
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
              key={cat.id !== null ? cat.id : 'all'}
              style={[
                styles.categoryButton,
                selectedCategoryId === cat.id && styles.activeCategory,
              ]}
              onPress={() => setSelectedCategoryId(cat.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategoryId === cat.id && styles.activeCategoryText,
                ]}
              >
                {cat.name}
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
                <Ionicons name="search-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>
                  No {selectedType}s found{selectedCategoryId !== null ? ` in this category` : ''}
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
                <Ionicons name="home" size={22} color={!isMarketVisible ? COLORS.primary : COLORS.textLight} />
                <Text style={[styles.bottomNavText, { color:!isMarketVisible ? COLORS.primary : COLORS.textLight }]}>Home</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.bottomNavButton} onPress={toggleMarket}>
                <Ionicons name="cart-outline" size={22} color={isMarketVisible ? COLORS.primary : COLORS.textLight} />
                <Text style={[styles.bottomNavText, { color: isMarketVisible ? COLORS.primary : COLORS.textLight }]}>
                  Market
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.bottomNavButton}
                onPress={() => router.push("/orders/OrderHistoryScreen")}
              >
                <Ionicons name="list" size={22} color={COLORS.textLight} />
                <Text style={[styles.bottomNavText, { color: COLORS.textLight }]}>Orders</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.bottomNavButton}
                onPress={() => router.push("/profile/ProfileScreen")}
              >
                <Ionicons name="person-outline" size={22} color={COLORS.textLight} />
                <Text style={[styles.bottomNavText, { color: COLORS.textLight }]}>Profile</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        ) : (
          <SafeAreaView edges={['bottom']} style={styles.bottomNavWrapper}>
            <View style={styles.bottomNav}>
              <TouchableOpacity style={styles.bottomNavButton} onPress={() => router.push("/home/Homescreen")}>
                <Ionicons name="home" size={22} color={isMarketVisible ? COLORS.primary : COLORS.textLight} />
                <Text style={[styles.bottomNavText, { color: isMarketVisible ? COLORS.primary : COLORS.textLight }]}>Home</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.bottomNavButton} onPress={toggleMarket}>
                <Ionicons name="cart-outline" size={22} color={!isMarketVisible ? COLORS.primary : COLORS.textLight} />
                <Text style={[styles.bottomNavText, { color: !isMarketVisible ? COLORS.primary : COLORS.textLight }]}>
                  Market
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.bottomNavButton}
                onPress={() => router.push("/orders/OrderHistoryScreen")}
              >
                <Ionicons name="list" size={22} color={COLORS.textLight} />
                <Text style={[styles.bottomNavText, { color: COLORS.textLight }]}>Orders</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.bottomNavButton}
                onPress={() => router.push("/profile/ProfileScreen")}
              >
                <Ionicons name="person-outline" size={22} color={COLORS.textLight} />
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
    backgroundColor: "#f8f9fa",
  },
  innerContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f8f9fa',
  },
  
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: '#333',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },

  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: "#007AFF",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 8,
  },
  toggleText: { 
    color: "#007AFF", 
    fontWeight: "600",
    fontSize: 14,
  },
  activeToggle: { 
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  activeToggleText: { 
    color: "#fff" 
  },

  categoryScroll: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  categoryScrollContent: {
    paddingRight: 12,
    gap: 8,
    marginBottom: 8,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 24,
    paddingHorizontal: 18,
    height: 36,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  activeCategory: { 
    backgroundColor: "#007AFF", 
    borderColor: "#007AFF",
  },
  categoryText: { 
    fontSize: 14, 
    color: "#666",
    fontWeight: '500',
  },
  activeCategoryText: { 
    color: "#fff",
    fontWeight: '600',
  },

  flatListContent: { 
    paddingBottom: 120,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  columnWrapper: { 
    justifyContent: "space-between", 
    paddingHorizontal: 8,
    marginBottom: 16,
    gap: 12,
  },
  
  // Enhanced Card Styles
  card: {
    backgroundColor: "#fff",
    width: "48%",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardImageContainer: {
    position: 'relative',
    width: "100%",
    height: 140,
    backgroundColor: '#f8f9fa',
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: 'cover',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  badge: {
    backgroundColor: '#ff4757',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  serviceBadge: {
    backgroundColor: '#4CAF50',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  cardContent: {
    padding: 10,
  },
  itemTitle: { 
    fontWeight: "700", 
    fontSize: 14, 
    marginBottom: 6,
    color: '#333',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 4,
  },
  sellerText: { 
    fontSize: 11, 
    color: "#666",
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  locationText: { 
    fontSize: 10, 
    color: "#999", 
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  price: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#007AFF",
  },
  discountBadge: {
    backgroundColor: '#ff4757',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },

  serviceExtraInfo: {
    marginBottom: 10,
    gap: 6,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    color: "#ff9800",
    fontWeight: "600",
  },
  reviewCount: {
    fontSize: 10,
    color: "#999",
  },
  serviceTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceTypeText: {
    fontSize: 9,
    color: "#007AFF",
    fontWeight: "600",
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },

  cardButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  msgBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    borderWidth: 1,
    borderColor: "#007AFF",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  msgBtnText: { 
    color: "#007AFF", 
    fontSize: 11,
    fontWeight: '600',
  },
  orderBtn: {
    flex: 1,
    backgroundColor: "#007AFF",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnText: { 
    color: "#fff", 
    fontSize: 11,
    fontWeight: '600',
  },
  whatsappBtn: {
    padding: 6,
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
    paddingTop: 8,
    paddingBottom: isIOS ? 24 : 8,
    backgroundColor: isIOS ? 'rgba(255,255,255,0.95)' : COLORS.white,
  },
  bottomNavButton: {
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 4,
  },
  bottomNavText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  
  marketModalContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  marketModal: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    paddingVertical: 60,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  placeholderImage: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
});