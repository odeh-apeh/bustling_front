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
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "@/helpers/core-service";

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

  // Fetch user profile data
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

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleEditProfile = () => {
    router.push("/profile/EditProfileScreen" as any);
  };

  const handleUpdateProfile = async (updatedData: Partial<UserProfile>) => {
    try {
      const response = await fetch(`${BASE_URL}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();

      if (data.success) {
        setUserProfile(data.user);
        Alert.alert("Success", "Profile updated successfully");
        return true;
      } else {
        Alert.alert("Error", data.message || "Failed to update profile");
        return false;
      }
    } catch (error) {
      console.error("Update profile error:", error);
      Alert.alert("Error", "Failed to update profile");
      return false;
    }
  };

  const handleResetPassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/user/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Password updated successfully");
        return true;
      } else {
        Alert.alert("Error", data.message || "Failed to update password");
        return false;
      }
    } catch (error) {
      console.error("Reset password error:", error);
      Alert.alert("Error", "Failed to update password");
      return false;
    }
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
      title: "My Bookings", 
      subtitle: "Manage your service bookings",
      icon: "calendar-outline",
      screen: "/bookings/BookingHistoryScreen",
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
    {
      title: "Wishlist",
      subtitle: "Your saved items",
      icon: "heart-outline",
      screen: "/wishlist/WishlistScreen",
    },
    {
      title: "Addresses",
      subtitle: "Manage your addresses",
      icon: "location-outline",
      screen: "/profile/AddressScreen",
    },
  ];

  const supportItems = [
    // {
    //   title: "Help & Support",
    //   subtitle: "Get help with your account",
    //   icon: "help-circle-outline",
    //   screen: "/support/HelpScreen",
    // },
    // {
    //   title: "Trust & Safety",
    //   subtitle: "Learn about our safety measures",
    //   icon: "shield-checkmark-outline",
    //   screen: "/support/TrustSafetyScreen",
    // },
    {
      title: "Change Password",
      subtitle: "Update your password",
      icon: "lock-closed-outline",
      screen: "/profile/ChangePasswordScreen",
    },
    {
      title: "Customer Support",
      subtitle: "Get help with your account",
      icon: "headset-outline",
      screen: "/support/CustomerServiceScreen",
    },
  ];

  const MenuItem = ({ icon, title, subtitle, onPress }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={24} color="#007AFF" />
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => router.push("/settings/SettingsScreen")}>
            <Ionicons name="settings-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => router.push("/settings/SettingsScreen")}>
            <Ionicons name="settings-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchProfile()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => router.push("/settings/SettingsScreen")}>
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProfile(true)}
            colors={["#007AFF"]}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(userProfile.name)}
              </Text>
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>{userProfile.name}</Text>
          <Text style={styles.userEmail}>{userProfile.email}</Text>
          <Text style={styles.userPhone}>{userProfile.phone}</Text>
          
          <View style={styles.userInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.infoText}>{userProfile.location || "No location set"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={14} color="#666" />
              <Text style={styles.infoText}>{userProfile.type || "User"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.infoText}>Member since {formatDate(userProfile.created_at)}</Text>
            </View>
          </View>

          {wallet && (
            <View style={styles.walletContainer}>
              <Ionicons name="wallet-outline" size={20} color="#007AFF" />
              <Text style={styles.walletText}>₦{wallet.balance.toLocaleString()}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={16} color="#007AFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Activity Summary</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="cube-outline" size={24} color="#007AFF" />
                <Text style={styles.statValue}>{stats.productOrders}</Text>
                <Text style={styles.statLabel}>Products Bought</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="construct-outline" size={24} color="#007AFF" />
                <Text style={styles.statValue}>{stats.serviceOrders}</Text>
                <Text style={styles.statLabel}>Services Booked</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="cart-outline" size={24} color="#007AFF" />
                <Text style={styles.statValue}>{stats.productsListed}</Text>
                <Text style={styles.statLabel}>Items Listed</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="business-outline" size={24} color="#007AFF" />
                <Text style={styles.statValue}>{stats.servicesListed}</Text>
                <Text style={styles.statLabel}>Services Listed</Text>
              </View>
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>My Account</Text>
          {menuItems.map((item, index) => (
            <MenuItem
              key={index}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => router.push(item.screen as any)}
            />
          ))}
        </View>

        {/* Support Section */}
        <View style={styles.supportSection}>
          <Text style={styles.sectionTitle}>Support & Settings</Text>
          {supportItems.map((item, index) => (
          <MenuItem
            key={index}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => router.push(item.screen as any)}  // ✅ SIMPLE NAVIGATION
            
          />
        ))}
        </View>
        

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 25,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  profileHeader: {
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#007AFF",
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
    backgroundColor: "#007AFF",
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
    color: "#111",
  },
  userEmail: {
    fontSize: 16,
    color: "#666",
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: "#666",
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
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  walletContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  walletText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: 6,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 20,
  },
  editButtonText: {
    color: "#007AFF",
    fontWeight: "600",
    marginLeft: 6,
  },
  statsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#111",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f8f9ff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#007AFF",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  menuSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f8f8",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuText: {
    marginLeft: 12,
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  supportSection: {
    padding: 20,
  },
});