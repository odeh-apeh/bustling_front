import React, { useState } from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";

const isIOS = Platform.OS === 'ios';

export default function AgreePriceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const deliveryCompanyId = params.deliveryCompanyId as string;
  const deliveryCompanyName = params.deliveryCompanyName as string;
  const orderId = params.orderId as string;
  const agentUserId = params.agentUserId as string;
  
  const [agreedPrice, setAgreedPrice] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestDelivery = async () => {
    if (!agreedPrice || parseFloat(agreedPrice) <= 0) {
      Alert.alert("Error", "Please enter a valid delivery price");
      return;
    }

    if (!shippingAddress.trim()) {
      Alert.alert("Error", "Please enter a shipping address");
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${BASE_URL}/api/delivery/request`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId: orderId,
          deliveryCompanyId: deliveryCompanyId,
          address: shippingAddress,
          agreedPrice: parseFloat(agreedPrice)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert(
          "Success",
          `Delivery assigned to ${deliveryCompanyName} for ₦${parseFloat(agreedPrice).toLocaleString()}`,
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate back or to order details
                router.push({
                  pathname: "/payment/OrderSuccessScreen",
                  params: { orderId: orderId,
    deliveryCompanyId: deliveryCompanyId,
    deliveryCompanyName: deliveryCompanyName,
    agentUserId: agentUserId }
                });
              }
            }
          ]
        );
      } else {
        Alert.alert("Error", data.message || "Failed to request delivery");
      }
    } catch (error) {
      console.error("❌ Request delivery error:", error);
      Alert.alert("Error", "Failed to request delivery. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ 
        headerShown: false,
        statusBarStyle: 'dark',
        statusBarBackgroundColor: '#fff',
      }} />
      
      <View style={styles.innerContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Delivery</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Order Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order ID:</Text>
              <Text style={styles.infoValue}>#{orderId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Delivery Company:</Text>
              <Text style={styles.infoValue}>{deliveryCompanyName}</Text>
            </View>
          </View>

          {/* Agreed Price Input */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Agreed Delivery Price (₦)</Text>
            <Text style={styles.inputDescription}>
              Enter the price you agreed with {deliveryCompanyName} for delivery
            </Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>₦</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={agreedPrice}
                onChangeText={setAgreedPrice}
              />
            </View>
          </View>

          {/* Shipping Address */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Shipping Address</Text>
            <Text style={styles.inputDescription}>
              Where should the item be delivered?
            </Text>
            <TextInput
              style={styles.addressInput}
              placeholder="Enter your complete delivery address"
              multiline
              numberOfLines={3}
              value={shippingAddress}
              onChangeText={setShippingAddress}
            />
          </View>

          {/* Notes */}
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Ionicons name="information-circle-outline" size={18} color="#007AFF" />
              <Text style={styles.notesTitle}>Important Notes</Text>
            </View>
            <Text style={styles.notesText}>
              • The agreed price will be deducted from your wallet {"\n"}
              • Payment will be held in escrow until delivery is confirmed {"\n"}
              • You can confirm delivery after receiving the item {"\n"}
              • Contact the delivery company if there are any issues
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleRequestDelivery}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.submitButtonText}>Processing...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Request Delivery</Text>
              </>
            )}
          </TouchableOpacity>

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: isIOS ? 10 : 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: '#000',
    textAlign: 'center',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  infoCard: {
    backgroundColor: "#f0f8ff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: '600',
  },
  inputCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e3f2fd",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 6,
  },
  inputDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007AFF",
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
    paddingVertical: 12,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  notesCard: {
    backgroundColor: "#fff8e1",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ffecb3",
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF9800",
  },
  notesText: {
    fontSize: 12,
    color: "#FF9800",
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 10,
    gap: 10,
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});