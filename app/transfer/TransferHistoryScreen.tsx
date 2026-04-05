// app/transfer/TransferHistoryScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "@/helpers/core-service";

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

  useEffect(() => {
    fetchTransfers();
  }, []);

  const renderTransferItem = ({ item }: { item: Transfer }) => (
    <TouchableOpacity style={styles.transferItem}>
      <View style={styles.transferIcon}>
        <Ionicons
          name={item.transfer_type === "sent" ? "arrow-up" : "arrow-down"}
          size={20}
          color={item.transfer_type === "sent" ? "#FF3B30" : "#34C759"}
        />
      </View>
      <View style={styles.transferInfo}>
        <Text style={styles.transferName}>
          {item.other_party_name}
        </Text>
        <Text style={styles.transferPhone}>
          {item.other_party_phone}
        </Text>
        {item.note && (
          <Text style={styles.transferNote}>{item.note}</Text>
        )}
        <Text style={styles.transferDate}>
          {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString()}
        </Text>
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
        <View
          style={[
            styles.statusBadge,
            item.status === "completed" ? styles.statusCompleted : styles.statusPending,
          ]}
        >
          <Text style={styles.statusText}>
            {item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Transfer History" }} />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Transfer History" }} />
      <View style={styles.container}>
        <FlatList
          data={transfers}
          renderItem={renderTransferItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => fetchTransfers(true)}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="send-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No transfers yet</Text>
              <Text style={styles.emptySubtext}>
                Send money to friends and family to see your history here
              </Text>
              <TouchableOpacity
                style={styles.newTransferButton}
                onPress={() => router.push("/transfer/TransferScreen")}
              >
                <Text style={styles.newTransferText}>Make Your First Transfer</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  transferItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  transferIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transferInfo: {
    flex: 1,
  },
  transferName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  transferPhone: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  transferNote: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  transferDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "600",
  },
  amountSent: {
    color: "#FF3B30",
  },
  amountReceived: {
    color: "#34C759",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusCompleted: {
    backgroundColor: "#f0f9f0",
  },
  statusPending: {
    backgroundColor: "#fff9e6",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "capitalize",
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
  newTransferButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  newTransferText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});