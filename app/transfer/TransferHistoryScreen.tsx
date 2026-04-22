// app/transfer/TransferHistoryScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";

const { width } = Dimensions.get("window");

interface Transfer {
  id: number;
  amount: number;
  note: string;
  status: string;
  created_at: string;
  transfer_type: "sent" | "received";
  other_party_name: string;
  other_party_phone: string;
}

export default function TransferHistoryScreen() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchTransfers();
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

  const fetchTransfers = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(
        `${BASE_URL}/api/transfer/history?limit=50`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.success) {
        setTransfers(data.transfers);
      }
    } catch (error) {
      console.error("Fetch transfers error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredTransfers = () => {
    if (filter === "all") return transfers;
    return transfers.filter(t => t.transfer_type === filter);
  };

  const getTotalStats = () => {
  const sent = transfers
    .filter(t => t.transfer_type === "sent")
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(t.amount)), 0);
  
  const received = transfers
    .filter(t => t.transfer_type === "received")
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(t.amount)), 0);
  
  return { sent, received };
};

  const stats = getTotalStats();
  const filteredTransfers = getFilteredTransfers();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "#34C759";
      case "pending":
        return "#FF9500";
      case "failed":
        return "#FF3B30";
      default:
        return "#8E8E93";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "checkmark-circle";
      case "pending":
        return "time";
      case "failed":
        return "close-circle";
      default:
        return "ellipse";
    }
  };

  const renderTransferItem = ({ item, index }: { item: Transfer; index: number }) => (
    <Animated.View
      style={[
        styles.transferItem,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.transferIconContainer}>
        <LinearGradient
          colors={
            item.transfer_type === "sent"
              ? ["#FF3B30", "#FF6B6B"]
              : ["#34C759", "#4CD964"]
          }
          style={styles.transferIconGradient}
        >
          <Ionicons
            name={item.transfer_type === "sent" ? "arrow-up" : "arrow-down"}
            size={22}
            color="#fff"
          />
        </LinearGradient>
      </View>
      
      <View style={styles.transferInfo}>
        <View style={styles.transferHeader}>
          <Text style={styles.transferName}>
            {item.other_party_name}
          </Text>
          <Text style={styles.transferDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        
        <Text style={styles.transferPhone}>
          <Ionicons name="call-outline" size={12} color="#999" /> {item.other_party_phone}
        </Text>
        
        {item.note && (
          <View style={styles.noteContainer}>
            <Ionicons name="chatbubble-outline" size={12} color="#999" />
            <Text style={styles.transferNote} numberOfLines={1}>
              {item.note}
            </Text>
          </View>
        )}
        
        <View style={styles.transferFooter}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Ionicons name={getStatusIcon(item.status)} size={10} color={getStatusColor(item.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
          <Text style={styles.fullDate}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      
      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amount,
            item.transfer_type === "sent" ? styles.amountSent : styles.amountReceived,
          ]}
        >
          {item.transfer_type === "sent" ? "-" : "+"}₦{item.amount.toLocaleString()}
        </Text>
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <LinearGradient
        colors={["#185FA5", "#0F4A7A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transfer History</Text>
          <TouchableOpacity
            onPress={() => fetchTransfers(true)}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      {transfers.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#FF3B3015" }]}>
              <Ionicons name="arrow-up" size={20} color="#FF3B30" />
            </View>
            <Text style={styles.statLabel}>Total Sent</Text>
            <Text style={[styles.statValue, { color: "#FF3B30" }]}>
              ₦{stats.sent.toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#34C75915" }]}>
              <Ionicons name="arrow-down" size={20} color="#34C759" />
            </View>
            <Text style={styles.statLabel}>Total Received</Text>
            <Text style={[styles.statValue, { color: "#34C759" }]}>
              ₦{stats.received.toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      {transfers.length > 0 && (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
            onPress={() => setFilter("all")}
          >
            <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "sent" && styles.filterTabActive]}
            onPress={() => setFilter("sent")}
          >
            <Text style={[styles.filterText, filter === "sent" && styles.filterTextActive]}>
              Sent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "received" && styles.filterTabActive]}
            onPress={() => setFilter("received")}
          >
            <Text style={[styles.filterText, filter === "received" && styles.filterTextActive]}>
              Received
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transfer List */}
      <FlatList
        data={filteredTransfers}
        renderItem={renderTransferItem}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTransfers(true)}
            colors={["#007AFF"]}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="swap-horizontal-outline" size={60} color="#C7C7CC" />
            </View>
            <Text style={styles.emptyTitle}>No transfers yet</Text>
            <Text style={styles.emptySubtext}>
              Send money to friends and family to see your history here
            </Text>
            <TouchableOpacity
              style={styles.newTransferButton}
              onPress={() => router.push("/transfer/TransferScreen")}
            >
              <LinearGradient
                colors={["#185FA5", "#0F4A7A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.newTransferText}>Make Your First Transfer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: "#666",
  },
  
  // Header
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  
  // Stats
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: "#8E8E93",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E5EA",
  },
  
  // Filter Tabs
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: "#007AFF",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#8E8E93",
  },
  filterTextActive: {
    color: "#fff",
  },
  
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  
  // Transfer Item
  transferItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  transferIconContainer: {
    marginRight: 14,
  },
  transferIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  transferInfo: {
    flex: 1,
  },
  transferHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  transferName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  transferDate: {
    fontSize: 11,
    color: "#8E8E93",
  },
  transferPhone: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  transferNote: {
    fontSize: 11,
    color: "#8E8E93",
    flex: 1,
  },
  transferFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  fullDate: {
    fontSize: 10,
    color: "#C7C7CC",
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
  },
  amountSent: {
    color: "#FF3B30",
  },
  amountReceived: {
    color: "#34C759",
  },
  
  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  newTransferButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  newTransferText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});