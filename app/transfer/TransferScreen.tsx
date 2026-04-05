// app/transfer/TransferScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";

interface Beneficiary {
  id: number;
  name: string;
  phone: string;
}

export default function TransferScreen() {
  const router = useRouter();
  const [recipientPhone, setRecipientPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const lookupUser = async () => {
    if (!recipientPhone.trim()) {
      Alert.alert("Error", "Please enter a phone number");
      return;
    }

    setSearching(true);
    try {
      const url = `${BASE_URL}/api/transfer/lookup?phone=${encodeURIComponent(recipientPhone)}`;
      console.log("🔍 Looking up user with URL:", url);
      
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
        }
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);
      
      // First, get the response as text
      const responseText = await response.text();
      console.log("📡 Response text (first 500 chars):", responseText.substring(0, 500));
      
      // Check if it's HTML (error page)
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html') || responseText.startsWith('<')) {
        console.error("❌ Server returned HTML error page");
        
        // Try to extract error message from HTML
        let errorMessage = "Server error";
        const match = responseText.match(/<title>(.*?)<\/title>/);
        if (match) {
          errorMessage = match[1];
        }
        
        Alert.alert("Server Error", `Server returned: ${errorMessage}`);
        return;
      }
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ JSON parse error:", parseError);
        console.error("❌ Full response:", responseText);
        Alert.alert("Error", "Invalid response from server. Please try again.");
        return;
      }

      // Check if unauthorized
      if (response.status === 401) {
        Alert.alert("Session Expired", "Please login again");
        router.push("/login/LoginScreen");
        return;
      }

      if (data.success) {
        setBeneficiary(data.user);
      } else {
        setBeneficiary(null);
        Alert.alert("Not Found", data.message || "User not found");
      }
    } catch (error: any) {
      console.error("Lookup error details:", error);
      
      // Network error handling
      if (error.message?.includes('Network request failed')) {
        Alert.alert("Connection Error", "Cannot connect to server. Please check your internet connection.");
      } else if (error.message?.includes('JSON Parse error')) {
        Alert.alert("Server Error", "Server returned invalid data. Please try again.");
      } else {
        Alert.alert("Error", "Failed to lookup user");
      }
    } finally {
      setSearching(false);
    }
  };

  const handleTransfer = async () => {
    if (!beneficiary) {
      Alert.alert("Error", "Please verify recipient first");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api/transfer/initiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Accept': 'application/json',
          },
          credentials: "include",
          body: JSON.stringify({
            recipientPhone: beneficiary.phone,
            amount: parseFloat(amount),
            note: note.trim(),
          }),
        }
      );

      console.log("📡 Transfer response status:", response.status);
      
      // First get as text
      const responseText = await response.text();
      console.log("📡 Transfer response text:", responseText.substring(0, 500));
      
      // Check if it's HTML
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html') || responseText.startsWith('<')) {
        console.error("❌ Transfer: Server returned HTML error page");
        Alert.alert("Server Error", "Server error during transfer. Please try again.");
        return;
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Transfer JSON parse error:", parseError);
        Alert.alert("Error", "Invalid response from server during transfer");
        return;
      }

      if (data.success) {
        Alert.alert(
          "Success",
          `₦${parseFloat(amount).toLocaleString()} transferred successfully to ${beneficiary.name}`,
          [
            {
              text: "View History",
              onPress: () => router.push("/transfer/TransferHistoryScreen"),
            },
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert("Transfer Failed", data.message || "Transfer failed");
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      
      if (error.message?.includes('Network request failed')) {
        Alert.alert("Connection Error", "Cannot connect to server during transfer.");
      } else {
        Alert.alert("Error", "Transfer failed. Please try again.");
      }
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
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer Money</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Recipient Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send To</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInput}>
                <TextInput
                  style={styles.phoneTextInput}
                  placeholder="Enter recipient's phone number"
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={lookupUser}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {beneficiary && (
              <View style={styles.beneficiaryCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {beneficiary.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.beneficiaryInfo}>
                  <Text style={styles.beneficiaryName}>{beneficiary.name}</Text>
                  <Text style={styles.beneficiaryPhone}>{beneficiary.phone}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              </View>
            )}
          </View>

          {/* Amount Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amount</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>₦</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Note Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Note (Optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note for this transfer"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Transfer Button */}
          <TouchableOpacity
            style={[
              styles.transferButton,
              (!beneficiary || !amount || loading) && styles.transferButtonDisabled,
            ]}
            onPress={handleTransfer}
            disabled={!beneficiary || !amount || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.transferButtonText}>
                Transfer ₦{amount ? parseFloat(amount).toLocaleString() : "0.00"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={16} color="#666" />
            <Text style={styles.securityText}>
              Transfers are instant and secure
            </Text>
          </View>

          {/* Debug Button (temporary) */}
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={() => {
              console.log("🔍 Current state:", {
                beneficiary,
                recipientPhone,
                amount,
                note
              });
              Alert.alert("Debug Info", JSON.stringify({
                beneficiary,
                recipientPhone,
                amount,
                note
              }, null, 2));
            }}
          >
            <Text style={styles.debugButtonText}>Debug Info</Text>
          </TouchableOpacity>

          {/* Bottom padding for safe area */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: '#000',
  },
  placeholder: {
    width: 26,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#111",
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#666",
  },
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
  },
  phoneTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
  },
  verifyButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  verifyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  beneficiaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9ff",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  beneficiaryInfo: {
    flex: 1,
  },
  beneficiaryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  beneficiaryPhone: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: "#111",
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  transferButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 20,
  },
  transferButtonDisabled: {
    backgroundColor: "#ccc",
  },
  transferButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  debugButton: {
    backgroundColor: "#666",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  debugButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});