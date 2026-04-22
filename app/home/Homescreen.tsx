import ConfirmationModal from "@/components/confirmation";
import { useToast } from "@/contexts/toast-content";
import { BASE_URL, CoreService } from "@/helpers/core-service";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const isIOS = Platform.OS === "ios";
const statusBarHeight = isIOS ? 20 : StatusBar.currentHeight || 0;

const COLORS = {
  primary: "#185FA5",
  primaryDark: "#0F4A7A",
  primaryLight: "#E6F1FB",
  secondary: "#4CAF50",
  accent: "#EF9F27",
  background: "#F8FAFC",
  white: "#FFFFFF",
  text: "#111827",
  textLight: "#6B7280",
  border: "#E5E7EB",
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
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const service: CoreService = new CoreService();
  const { showToast, isMarketVisible, setMarketVisible } = useToast();
  const [open, setOpen] = useState<boolean>(false);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      const balanceResponse = await fetch(`${BASE_URL}/api/wallet/balance`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });

      const balanceText = await balanceResponse.text();
      let balanceData;
      try {
        balanceData = JSON.parse(balanceText);
      } catch (e) {
        balanceData = { balance: 0 };
      }

      const profileResponse = await fetch(`${BASE_URL}/api/user/profile`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });

      const profileText = await profileResponse.text();
      let profileData;
      try {
        profileData = JSON.parse(profileText);
      } catch (e) {
        profileData = { success: false };
      }

      if (profileData.success) {
        const userData = {
          user: profileData.user,
          wallet: {
            ...(profileData.wallet || {}),
            balance: balanceData.balance || 0,
          },
        };
        setUser(userData);
      } else {
        showToast("Session expired. Please login again", "error");
        router.replace("/login/LoginScreen");
      }
    } catch (error: any) {
      console.error("Failed to load profile:", error);
      showToast("Failed to load user data", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await service.send(`/api/notifications/get-notifications`, {
        userId: user?.user.id,
      });
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (e: any) {
      showToast("Unable to get notifications", "error");
    }
  };

  useEffect(() => {
    if (isMarketVisible) {
      slideAnim.setValue(0);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [isMarketVisible]);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

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
    if (isMarketVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setMarketVisible(false);
      });
    } else {
      setMarketVisible(true);
      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, 10);
    }
  };

  const handleMarketAction = (path: string) => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setMarketVisible(false);
      setTimeout(() => {
        router.push(path as any);
      }, 50);
    });
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        setOpen(true);

        // Return true to prevent default behavior, false to allow it
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => {
        subscription.remove();
      };
    }, []),
  );

  const handleLogout = async () => {
    try {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      showToast("Logged out successfully");
      router.dismissAll()
      // router.replace("/login/LoginScreen");
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };

  const getSellerInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar backgroundColor={"#12569a"} barStyle={"default"}></StatusBar>
      <Stack.Screen
        options={{
          headerShown: false,
          statusBarStyle: "light",
        }}
      />

      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.innerContainer}>

          {/* Hero Section with Gradient */}
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroSection}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <View
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "10",
                  flexDirection: "row",
                }}
              >
                <TouchableOpacity
                  style={styles.glassBtn}
                  onPress={() => router.push("/profile/ProfileScreen")}
                >
                  <View style={styles.profileIcon}>
                    <Text style={styles.profileInitial}>
                      {user?.user.name?.charAt(0) || "U"}
                    </Text>
                  </View>
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Bustling</Text>
              </View>

              <View style={styles.headerIcons}>
                <TouchableOpacity
                  style={styles.glassBtnSmall}
                  onPress={() =>
                    router.push("/notifications/NotificationsScreen")
                  }
                >
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color="#fff"
                  />
                  {notifications.length > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.badgeText}>
                        {notifications.length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.glassBtnSmall}
                  onPress={() => setOpen(true)}
                >
                  <Ionicons name="log-out-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceLeft}>
                <Text style={styles.welcomeText}>
                  Hello,{" "}
                  <Text style={styles.userName}>
                    {user?.user.name || "User"}
                  </Text>
                </Text>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text style={styles.balanceAmount}>
                  ₦
                  {user?.wallet.balance?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  }) || "0.00"}
                </Text>
              </View>

              <View style={styles.balanceRight}>
                <View style={styles.walletCard}>
                  <Ionicons
                    name="wallet-outline"
                    size={20}
                    color="rgba(255,255,255,0.8)"
                  />
                  <Text style={styles.walletLabel}>Wallet</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Main Content - Bottom Sheet Style */}
          <View style={styles.contentSheet}>
            <View style={styles.dragPill} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                      <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                setLoading(true);
                fetchUserProfile();
              }}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />

              }
            >
              {/* Quick Actions */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Quick Actions</Text>
                <View style={styles.actionsGrid}>
                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push("/wallet/DepositScreen" as any)}
                  >
                    <View
                      style={[
                        styles.actionIcon,
                        { backgroundColor: COLORS.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={24}
                        color={COLORS.primary}
                      />
                    </View>
                    <Text style={styles.actionText}>Top Up</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() =>
                      router.push("/wallet/WithdrawalScreen" as any)
                    }
                  >
                    <View
                      style={[
                        styles.actionIcon,
                        { backgroundColor: COLORS.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name="cash-outline"
                        size={24}
                        color={COLORS.primary}
                      />
                    </View>
                    <Text style={styles.actionText}>Withdraw</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={toggleMarket}
                  >
                    <View
                      style={[
                        styles.actionIcon,
                        { backgroundColor: COLORS.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name="cart-outline"
                        size={24}
                        color={COLORS.primary}
                      />
                    </View>
                    <Text style={styles.actionText}>Market</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push("/transfer/TransferScreen")}
                  >
                    <View
                      style={[
                        styles.actionIcon,
                        { backgroundColor: COLORS.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name="send-outline"
                        size={24}
                        color={COLORS.primary}
                      />
                    </View>
                    <Text style={styles.actionText}>Transfer</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Why Choose Bustling */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Why Choose Bustling</Text>

                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  ref={scrollRef}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false },
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
                      extrapolate: "clamp",
                    });

                    const scale = scrollX.interpolate({
                      inputRange,
                      outputRange: [0.92, 1, 0.92],
                      extrapolate: "clamp",
                    });

                    return (
                      <Animated.View
                        key={slide.id}
                        style={[
                          styles.carouselItem,
                          { opacity, transform: [{ scale }] },
                        ]}
                      >
                        <View style={styles.carouselCard}>
                          <View style={styles.carouselIconContainer}>
                            <Ionicons
                              name={slide.icon}
                              size={32}
                              color={COLORS.primary}
                            />
                          </View>
                          <Text style={styles.carouselTitle}>
                            {slide.title}
                          </Text>
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

              <View style={styles.divider} />

              {/* Featured Services */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Featured Services</Text>

                <View style={styles.featuredCard}>
                  <View style={styles.featuredItem}>
                    <View
                      style={[
                        styles.featuredIcon,
                        { backgroundColor: COLORS.primary },
                      ]}
                    >
                      <MaterialIcons
                        name="delivery-dining"
                        size={24}
                        color={COLORS.white}
                      />
                    </View>
                    <View style={styles.featuredContent}>
                      <Text style={styles.featuredTitle}>Express Delivery</Text>
                      <Text style={styles.featuredText}>
                        Same-day delivery available
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={COLORS.textLight}
                    />
                  </View>

                  <View style={styles.featuredDivider} />

                  <View style={styles.featuredItem}>
                    <View
                      style={[
                        styles.featuredIcon,
                        { backgroundColor: COLORS.secondary },
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={24}
                        color={COLORS.white}
                      />
                    </View>
                    <View style={styles.featuredContent}>
                      <Text style={styles.featuredTitle}>Secure Payment</Text>
                      <Text style={styles.featuredText}>
                        100% escrow protected
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={COLORS.textLight}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.bottomPadding} />
            </ScrollView>
          </View>

          {/* Bottom Navigation */}
          <SafeAreaView edges={["bottom"]} style={styles.bottomNavWrapper}>
            <View style={styles.bottomNav}>
              <TouchableOpacity style={styles.bottomNavButton}>
                <Ionicons name="home" size={22} color={COLORS.primary} />
                <Text style={[styles.bottomNavText, { color: COLORS.primary }]}>
                  Home
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavButton}
                onPress={toggleMarket}
              >
                <Ionicons
                  name="cart-outline"
                  size={22}
                  color={COLORS.textLight}
                />
                <Text
                  style={[styles.bottomNavText, { color: COLORS.textLight }]}
                >
                  Market
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavButton}
                onPress={() => router.push("/orders/OrderHistoryScreen")}
              >
                <Ionicons
                  name="list-outline"
                  size={22}
                  color={COLORS.textLight}
                />
                <Text
                  style={[styles.bottomNavText, { color: COLORS.textLight }]}
                >
                  Orders
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavButton}
                onPress={() => router.push("/profile/ProfileScreen")}
              >
                <Ionicons
                  name="person-outline"
                  size={22}
                  color={COLORS.textLight}
                />
                <Text
                  style={[styles.bottomNavText, { color: COLORS.textLight }]}
                >
                  Profile
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Market Modal */}
          {isMarketVisible && (
            <>
              <BlurView
                intensity={isIOS ? 30 : 50}
                tint="dark"
                style={StyleSheet.absoluteFillObject}
              >
                <TouchableOpacity
                  style={styles.backdropTouchArea}
                  activeOpacity={1}
                  onPress={toggleMarket}
                />
              </BlurView>

              <SafeAreaView
                edges={["bottom"]}
                style={styles.marketModalContainer}
              >
                <Animated.View
                  style={[
                    styles.marketModal,
                    {
                      transform: [
                        {
                          translateY: slideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [300, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.marketModalHandle} />
                  <View style={styles.marketContent}>
                    <Text style={styles.marketModalTitle}>Marketplace</Text>

                    <TouchableOpacity
                      style={styles.marketOption}
                      onPress={() => handleMarketAction("/market/BuyScreen")}
                    >
                      <View
                        style={[
                          styles.marketOptionIcon,
                          { backgroundColor: COLORS.primaryLight },
                        ]}
                      >
                        <Ionicons
                          name="cart"
                          size={22}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={styles.marketOptionContent}>
                        <Text style={styles.marketOptionTitle}>
                          Buy Products & Services
                        </Text>
                        <Text style={styles.marketOptionText}>
                          Shop from verified sellers
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={COLORS.textLight}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.marketOption}
                      onPress={() => handleMarketAction("/market/SellScreen")}
                    >
                      <View
                        style={[
                          styles.marketOptionIcon,
                          { backgroundColor: COLORS.primaryLight },
                        ]}
                      >
                        <Ionicons
                          name="cash-outline"
                          size={22}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={styles.marketOptionContent}>
                        <Text style={styles.marketOptionTitle}>
                          Sell Your Items
                        </Text>
                        <Text style={styles.marketOptionText}>
                          List products or services
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={COLORS.textLight}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.marketOption}
                      onPress={() =>
                        handleMarketAction("/delivery/DeliveryAgentsScreen")
                      }
                    >
                      <View
                        style={[
                          styles.marketOptionIcon,
                          { backgroundColor: COLORS.primaryLight },
                        ]}
                      >
                        <Ionicons
                          name="car-outline"
                          size={22}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={styles.marketOptionContent}>
                        <Text style={styles.marketOptionTitle}>
                          Delivery Services
                        </Text>
                        <Text style={styles.marketOptionText}>
                          Find delivery agents
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={COLORS.textLight}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.closeMarketButton}
                      onPress={toggleMarket}
                    >
                      <Text style={styles.closeMarketText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </SafeAreaView>
            </>
          )}
        </View>
        <ConfirmationModal
          visible={open}
          onClose={() => setOpen(false)}
          onConfirm={() => handleLogout()}
          type={"warning"}
          confirmText="log out"
          cancelText="Cancel"
          message="Are you sure you want to log out?"
          title="Confirmation"
          loading={loading}
        ></ConfirmationModal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1923",
  },
  innerContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: "#6B7280",
  },

  // Hero Section
  heroSection: {
    paddingTop: statusBarHeight + 8,
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  glassBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  glassBtnSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    position: "relative",
  },
  profileIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Balance Card
  balanceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  balanceLeft: {
    flex: 1,
  },
  balanceRight: {
    alignItems: "flex-end",
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.5,
  },
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  walletLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },

  // Content Sheet
  contentSheet: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 6,
  },
  dragPill: {
    width: 36,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  divider: {
    height: 0.5,
    backgroundColor: "#F0F0F0",
    marginVertical: 18,
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: "22%",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },

  // Carousel
  carouselScroll: {
    flexDirection: "row",
  },
  carouselItem: {
    width: width * 0.75,
    marginRight: 16,
  },
  carouselCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  carouselIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  carouselText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    width: 20,
  },

  // Featured Card
  featuredCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  featuredItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featuredIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  featuredContent: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  featuredText: {
    fontSize: 12,
    color: "#6B7280",
  },
  featuredDivider: {
    height: 0.5,
    backgroundColor: "#E5E7EB",
    marginVertical: 14,
  },

  // Bottom Navigation
  bottomNavWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: isIOS ? 24 : 12,
  },
  bottomNavButton: {
    alignItems: "center",
    gap: 4,
  },
  bottomNavText: {
    fontSize: 10,
    fontWeight: "500",
  },
  bottomPadding: {
    height: 80,
  },

  // Notification Badge
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#E24B4A",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "bold",
  },

  // Market Modal
  backdropTouchArea: {
    flex: 1,
  },
  marketModalContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  marketModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  marketModalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  marketContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
  },
  marketModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  marketOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  marketOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  marketOptionContent: {
    flex: 1,
  },
  marketOptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  marketOptionText: {
    fontSize: 12,
    color: "#6B7280",
  },
  closeMarketButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  closeMarketText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
