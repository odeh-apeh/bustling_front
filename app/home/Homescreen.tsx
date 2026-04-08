import React, { useRef, useEffect, useState, use } from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Alert,
  Platform,
} from "react-native";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { BASE_URL, CoreService } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";

const { width, height } = Dimensions.get("window");

// Check if device is iOS
const isIOS = Platform.OS === 'ios';

// Colors
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

interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
  type: string;
  location: string;
}

interface Wallet {
  id: number;
  user_id: number;
  balance: number;
}

interface UserWithWallet {
  user: User;
  wallet: Wallet;
}

interface Slide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}

const aboutSlides: Slide[] = [
  {
    id: "1",
    icon: "storefront-outline",
    title: "Buy & Sell",
    text: "Shop for products and services or sell what you don't need with ease.",
  },
  {
    id: "2",
    icon: "car-outline",
    title: "Delivery Services",
    text: "Get reliable delivery agents to handle your packages and errands.",
  },
  {
    id: "3",
    icon: "shield-checkmark-outline",
    title: "Secure Payments",
    text: "All transactions are secured with escrow protection for your safety.",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  
  const [user, setUser] = useState<UserWithWallet | null>(null);
  const [loading, setLoading] = useState(true);
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const [isMarketVisible, setMarketVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const service:CoreService = new CoreService();
  const {showToast} = useToast();

  // Fetch user profile
  const fetchUserProfile = async () => {
  try {
    setLoading(true);
    console.log("Starting profile fetch...");
    
    // Test 1: Call balance endpoint directly
    const balanceResponse = await fetch(`${BASE_URL}/api/wallet/balance`, {
      method: 'GET',
      credentials: 'include', // This is CRITICAL for sessions
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    
    
    console.log("Balance response status:", balanceResponse.status);
    console.log("Balance response headers:", balanceResponse.headers);
    
    const balanceText = await balanceResponse.text();
    console.log("Balance response text:", balanceText);
    
    let balanceData;
    try {
      balanceData = JSON.parse(balanceText);
    } catch (e) {
      console.error("Failed to parse balance JSON:", e);
      balanceData = { balance: 0 };
    }
    
    console.log("Parsed balance data:", balanceData);
    
    // Test 2: Call profile endpoint
    const profileResponse = await fetch(`${BASE_URL}/api/user/profile`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log("Profile response status:", profileResponse.status);
    const profileText = await profileResponse.text();
    console.log("Profile response text:", profileText);
    
    let profileData;
    try {
      profileData = JSON.parse(profileText);
    } catch (e) {
      console.error("Failed to parse profile JSON:", e);
      profileData = { success: false };
    }
    
    if (profileData.success) {
      // Combine both responses
      const userData = {
        user: profileData.user,
        wallet: {
          ...(profileData.wallet || {}),
          balance: balanceData.balance || 0
        }
      };
      
      console.log("Setting user state with:", userData);
      setUser(userData);
    } else {
      console.log("Profile fetch failed:", profileData.message);
      Alert.alert("Session Expired", "Please login again");
      router.replace("/login/LoginScreen");
    }
  } catch (error: any) {
    console.error("Failed to load profile:", error);
    console.error("Error details:", error.message, error.stack);
    Alert.alert("Error", "Failed to load user data");
  } finally {
    setLoading(false);
    console.log("Profile fetch completed");
  }
};
  
    const fetchNotifications = async() => {
          try{
            const res = await service.send(`/api/notifications/get-notifications`,{userId:user?.user.id});
            if(res.success && Array.isArray(res.data)){
              setNotifications(res.data);
              console.log("Fetched notifications:", res.data);
            }
          }catch(e:any){
            showToast("Unable to get notifications", 'error');
          }
        }
  
  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if(user){
      fetchNotifications();
    }
  }, [user]);

  // Auto scroll for about section
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      const nextIndex = (index + 1) % aboutSlides.length;
      
      scrollRef.current?.scrollTo({
        x: width * 0.8 * nextIndex,
        animated: true,
      });
      
      index = nextIndex;
      setCurrentIndex(nextIndex);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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

  const handleLogout = async () => {
    try {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      
      setUser(null);
      showToast("Logged out successfully");
      router.replace("/login/LoginScreen");
    } catch (error:any) {
      showToast(error.message,'error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingSpinner}>
            <Ionicons name="logo-slack" size={50} color={COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ 
        headerShown: false,
        statusBarStyle: 'light',
      }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.innerContainer}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.profileButton}>
              <View style={styles.profileIcon}>
                <Text style={styles.profileInitial}>
                  {user?.user.name?.charAt(0) || 'U'}
                </Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.headerIcons}>
              { /*<TouchableOpacity 
                style={styles.headerIconButton}
                onPress={() => router.push("/transactions/TransactionHistoryScreen")}
              >
                <Ionicons name="time-outline" size={22} color={COLORS.text} />
              </TouchableOpacity> */}
              
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={() => router.push("/notifications/NotificationsScreen")}
              >
                <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
                {notifications.length > 0 && <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{notifications.length > 0 ? notifications.length : ''}</Text>
                </View>}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Welcome & Balance Card - COMPACT SIZE */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceLeft}>
                <Text style={styles.welcomeText}>
                  Hello, <Text style={styles.userName}>{user?.user.name || 'User'}</Text>
                </Text>
                <View>
                  <Text style={styles.balanceLabel}>Balance</Text>
                  <Text style={styles.balanceAmount}>
                    ₦{user?.wallet.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.balanceRight}>
                <Text style={styles.walletLabel}>Wallet Address</Text>
                <TouchableOpacity style={styles.walletIdButton}>
                  <Text style={styles.walletIdText}>
                    {user?.user.phone ? `${user.user.phone.slice(0, 4)}****${user.user.phone.slice(-2)}` : 'N/A'}
                  </Text>
                  <Feather
                    name="copy"
                    size={14}
                    color={COLORS.white}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
              </View>
              
              <View style={styles.actionsCard}>
                <View style={styles.actionsGrid}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => router.push("/wallet/DepositScreen" as any)}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
                      <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                    </View>
                    <Text style={styles.actionText}>Top Up</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => router.push("/wallet/WithdrawalScreen" as any)}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
                      <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
                    </View>
                    <Text style={styles.actionText}>Withdraw</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={toggleMarket}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
                      <Ionicons name="cart-outline" size={24} color={COLORS.primary} />
                    </View>
                    <Text style={styles.actionText}>Market</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => router.push("/transfer/TransferScreen")}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
                      <Ionicons name="send-outline" size={24} color={COLORS.primary} />
                    </View>
                    <Text style={styles.actionText}>Transfer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* About Errandly (Carousel) */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Why Choose Bustling</Text>
              </View>
              
              <View style={styles.carouselCard}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  ref={scrollRef}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                  )}
                  scrollEventThrottle={16}
                  style={styles.carouselScroll}
                >
                  {aboutSlides.map((slide, index) => {
                    const inputRange = [
                      (index - 1) * width * 0.8,
                      index * width * 0.8,
                      (index + 1) * width * 0.8,
                    ];
                    
                    const opacity = scrollX.interpolate({
                      inputRange,
                      outputRange: [0.5, 1, 0.5],
                      extrapolate: 'clamp',
                    });
                    
                    const scale = scrollX.interpolate({
                      inputRange,
                      outputRange: [0.9, 1, 0.9],
                      extrapolate: 'clamp',
                    });

                    return (
                      <Animated.View
                        key={slide.id}
                        style={[
                          styles.carouselItem,
                          { opacity, transform: [{ scale }] },
                        ]}
                      >
                        <View style={styles.carouselContent}>
                          <View style={styles.carouselIconContainer}>
                            <Ionicons name={slide.icon} size={32} color={COLORS.primary} />
                          </View>
                          <Text style={styles.carouselTitle}>{slide.title}</Text>
                          <Text style={styles.carouselText}>{slide.text}</Text>
                        </View>
                      </Animated.View>
                    );
                  })}
                </ScrollView>
                
                {/* Dots Indicator */}
                <View style={styles.dotsContainer}>
                  {aboutSlides.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        currentIndex === index && styles.activeDot,
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Promotions/Featured Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Featured Services</Text>
              </View>
              
              <View style={styles.featuredCard}>
                <View style={styles.featuredItem}>
                  <View style={styles.featuredIcon}>
                    <MaterialIcons name="delivery-dining" size={28} color={COLORS.white} />
                  </View>
                  <View style={styles.featuredContent}>
                    <Text style={styles.featuredTitle}>Express Delivery</Text>
                    <Text style={styles.featuredText}>Same-day delivery available</Text>
                  </View>
                </View>
                
                <View style={styles.featuredDivider} />
                
                <View style={styles.featuredItem}>
                  <View style={[styles.featuredIcon, { backgroundColor: COLORS.secondary }]}>
                    <Ionicons name="shield-checkmark" size={28} color={COLORS.white} />
                  </View>
                  <View style={styles.featuredContent}>
                    <Text style={styles.featuredTitle}>Secure Payment</Text>
                    <Text style={styles.featuredText}>100% escrow protected</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom padding */}
            <View style={styles.bottomPadding} />
          </ScrollView>

          {/* Bottom Navigation */}
          {isIOS ? (
            <BlurView intensity={90} style={styles.bottomNavWrapper}>
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

          {/* Animated Market Modal - FIXED VERSION */}
          


{isMarketVisible && (
  <SafeAreaView edges={['bottom']} style={styles.marketModalContainer}>
    <Animated.View
      style={[
        styles.marketModal,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [300, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.marketContent}>
        <Text style={styles.marketModalTitle}>Marketplace</Text>
        
        <TouchableOpacity
          style={styles.marketOption}
          onPress={() => handleMarketAction("/market/BuyScreen")}
        >
          <View style={[styles.marketOptionIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="cart" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.marketOptionContent}>
            <Text style={styles.marketOptionTitle}>Buy Products & Services</Text>
            <Text style={styles.marketOptionText}>Shop from verified sellers</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.marketOption}
          onPress={() => handleMarketAction("/market/SellScreen")}
        >
          <View style={[styles.marketOptionIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="cash" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.marketOptionContent}>
            <Text style={styles.marketOptionTitle}>Sell Your Items</Text>
            <Text style={styles.marketOptionText}>List products or services</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.marketOption}
          onPress={() => handleMarketAction("/delivery/DeliveryAgentsScreen")}
        >
          <View style={[styles.marketOptionIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="car" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.marketOptionContent}>
            <Text style={styles.marketOptionTitle}>Delivery Services</Text>
            <Text style={styles.marketOptionText}>Find delivery agents</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.closeMarketButton} 
          onPress={toggleMarket}
        >
          <Text style={styles.closeMarketText}>Close</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.modalBottomSafeArea} />
    </Animated.View>
  </SafeAreaView>
)}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background,
  },


modalBottomSafeArea: {
  height: isIOS ? 40 : 20,
},
  innerContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: isIOS ? 10 : 20,
    paddingBottom: 15,
    backgroundColor: COLORS.background,
  },
  profileButton: {
    padding: 4,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconButton: {
    padding: 8,
    marginLeft: 12,
    position: 'relative',
  },
  // SMALLER COMPACT BALANCE CARD
  balanceCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  balanceLeft: {
    flex: 1,
  },
  balanceRight: {
    alignItems: 'flex-end',
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  walletIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  walletIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    alignItems: 'center',
    width: '25%',
    marginBottom: 8,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  carouselCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  carouselScroll: {
    flexDirection: 'row',
  },
  carouselItem: {
    width: width * 0.8,
    marginRight: 16,
  },
  carouselContent: {
    flex: 1,
  },
  carouselIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  carouselText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    width: 20,
  },
  featuredCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  featuredItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featuredContent: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  featuredText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  featuredDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  bottomPadding: {
    height: 80,
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
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  marketContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    flex: 1,
  },
  marketModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  marketOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  marketOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  marketOptionContent: {
    flex: 1,
  },
  marketOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  marketOptionText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  closeMarketButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  closeMarketText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 9,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
});

//