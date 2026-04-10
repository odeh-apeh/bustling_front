import React, { useState, useEffect, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string;
  type: string;
  location: string;
  created_at: string;
};

type Wallet = {
  balance: number;
};

type UserStats = {
  totalOrders: number;
  productOrders: number;
  serviceOrders: number;
  totalListings: number;
  productsListed: number;
  servicesListed: number;
};

export default function ProfileScreen() {
  const router = useRouter();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const {setMarketVisible} = useToast();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchProfile();
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchProfile = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`${BASE_URL}/api/user/profile`, {
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setUserProfile(data.user);
        setWallet(data.wallet);
        setStats(data.stats);
        console.log(data.stats);
      } else {
        Alert.alert("Error", data.message || "Failed to load profile");
      }
    } catch (error) {
      console.error("Fetch profile error:", error);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEditProfile = () => {
    router.push("/profile/EditProfileScreen" as any);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const menuItems = [
    {
      title: "My Orders",
      subtitle: "Track your product orders",
      icon: "cube-outline",
      screen: "/orders/OrderHistoryScreen",
    },
    {
      title: "My Products",
      subtitle: "Manage your product listings",
      icon: "list-outline",
      screen: "/market/SellScreen",
    },
    {
      title: "My Services",
      subtitle: "Manage your service listings", 
      icon: "construct-outline",
      screen: "/market/SellScreen",
    },
  ];

  const supportItems = [
    {
      title: "Customer Support",
      subtitle: "Get help with your account",
      icon: "headset-outline",
      screen: "/support/CustomerServiceScreen",
    },
  ];

  const MenuItem = ({ icon, title, subtitle, onPress, isLast }: any) => (
    <TouchableOpacity 
      style={[styles.menuItem, !isLast && styles.menuItemWithBorder]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuLeft}>
        <View style={styles.menuIconContainer}>
          <Ionicons name={icon} size={22} color="#185FA5" />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false, statusBarStyle: 'dark' }} />
        <LinearGradient
          colors={['#185FA5', '#0F4A7A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={{
            display:'flex',
            flexDirection:'row',
            justifyContent:'center',
            alignItems:'center',
            gap:20
          }}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity onPress={() => {}}>
              {/* <Ionicons name="settings-outline" size={22} color="#fff" /> */}
            </TouchableOpacity>
            </View>
            
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#185FA5" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false, statusBarStyle: 'dark' }} />
        <LinearGradient
          colors={['#185FA5', '#0F4A7A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View  style={{
            display:'flex',
            flexDirection:'row',
            justifyContent:'center',
            alignItems:'center',
            gap:20
          }}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity onPress={() => router.push("/settings/SettingsScreen")} style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
            
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#D1D5DB" />
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchProfile()}>
            <LinearGradient
              colors={['#185FA5', '#0F4A7A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryGradient}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false, statusBarStyle: 'light' }} />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#185FA5', '#0F4A7A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          
          <View style={{
            display:'flex',
            flexDirection:'row',
            justifyContent:'center',
            alignItems:'center',
            gap:20
          }}>
            <TouchableOpacity onPress={() => {
            router.back();
            setMarketVisible(false);
          }} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          </View>
          <TouchableOpacity onPress={() => {}}>
            {/* <Ionicons name="settings-outline" size={22} color="#fff" /> */}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content Sheet */}
      <View style={styles.contentSheet}>
        <View style={styles.dragPill} />

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProfile(true)}
              colors={["#185FA5"]}
              tintColor="#185FA5"
            />
          }
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={['#185FA5', '#0F4A7A']}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {getInitials(userProfile.name)}
                  </Text>
                </LinearGradient>
                <TouchableOpacity style={styles.editAvatarButton}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.userName}>{userProfile.name}</Text>
              <Text style={styles.userEmail}>{userProfile.email}</Text>
              <Text style={styles.userPhone}>{userProfile.phone}</Text>
              
              <View style={styles.userInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text style={styles.infoText}>{userProfile.location || "No location set"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={14} color="#6B7280" />
                  <Text style={styles.infoText}>{userProfile.type || "User"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                  <Text style={styles.infoText}>Member since {formatDate(userProfile.created_at)}</Text>
                </View>
              </View>

              {wallet && (
                <View style={styles.walletContainer}>
                  <Ionicons name="wallet-outline" size={18} color="#185FA5" />
                  <Text style={styles.walletText}>₦{wallet.balance.toLocaleString()}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <Ionicons name="create-outline" size={16} color="#185FA5" />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Stats Grid */}
            {stats && (
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Activity Summary</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <View style={styles.statIconContainer}>
                      <Ionicons name="cube-outline" size={22} color="#185FA5" />
                    </View>
                    <Text style={styles.statValue}>{stats.productOrders}</Text>
                    <Text style={styles.statLabel}>Products Bought</Text>
                  </View>
                  <View style={styles.statCard}>
                    <View style={styles.statIconContainer}>
                      <Ionicons name="construct-outline" size={22} color="#185FA5" />
                    </View>
                    <Text style={styles.statValue}>{stats.serviceOrders}</Text>
                    <Text style={styles.statLabel}>Services Booked</Text>
                  </View>
                  <View style={styles.statCard}>
                    <View style={styles.statIconContainer}>
                      <Ionicons name="cart-outline" size={22} color="#185FA5" />
                    </View>
                    <Text style={styles.statValue}>{stats.productsListed}</Text>
                    <Text style={styles.statLabel}>Items Listed</Text>
                  </View>
                  <View style={styles.statCard}>
                    <View style={styles.statIconContainer}>
                      <Ionicons name="business-outline" size={22} color="#185FA5" />
                    </View>
                    <Text style={styles.statValue}>{stats.servicesListed}</Text>
                    <Text style={styles.statLabel}>Services Listed</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.divider} />

            {/* Menu Items */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>My Account</Text>
              {menuItems.map((item, index) => (
                <MenuItem
                  key={index}
                  icon={item.icon}
                  title={item.title}
                  subtitle={item.subtitle}
                  isLast={index === menuItems.length - 1}
                  onPress={() => router.push(item.screen as any)}
                />
              ))}
            </View>

            <View style={styles.divider} />

            {/* Support Section */}
            <View style={styles.supportSection}>
              <Text style={styles.sectionTitle}>Support & Settings</Text>
              {supportItems.map((item, index) => (
                <MenuItem
                  key={index}
                  icon={item.icon}
                  title={item.title}
                  subtitle={item.subtitle}
                  isLast={index === supportItems.length - 1}
                  onPress={() => router.push(item.screen as any)}
                />
              ))}
            </View>

            <View style={styles.bottomPadding} />
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1923',
  },
  
  // Header Gradient
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom:8
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  
  // Content Sheet
  contentSheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 6,
  },
  dragPill: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: "#6B7280",
    fontSize: 14,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#fff',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  
  // Profile Header
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#185FA5",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    color: "#111827",
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  userInfo: {
    alignItems: "center",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 6,
  },
  walletContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6F1FB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  walletText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#185FA5",
    marginLeft: 6,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#185FA5",
    borderRadius: 20,
    gap: 6,
  },
  editButtonText: {
    color: "#185FA5",
    fontWeight: "600",
    fontSize: 13,
  },
  
  // Stats Section
  statsSection: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E6F1FB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#185FA5",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
  
  // Divider
  divider: {
    height: 0.5,
    backgroundColor: '#F0F0F0',
    marginVertical: 20,
  },
  
  // Menu Section
  menuSection: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  menuItemWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E6F1FB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  
  supportSection: {
    paddingVertical: 8,
  },
  
  bottomPadding: {
    height: 40,
  },
});