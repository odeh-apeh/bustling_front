// app/transfer/TransferScreen.tsx
import React, { useState, useRef, useEffect } from "react";
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
  Animated,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
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

  const lookupUser = async () => {
    if (!recipientPhone.trim()) {
      Alert.alert("Error", "Please enter a phone number");
      return;
    }

    setSearching(true);
    try {
      const url = `${BASE_URL}/api/transfer/lookup?phone=${encodeURIComponent(recipientPhone)}`;
      
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
        }
      });

      const responseText = await response.text();
      
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        Alert.alert("Server Error", "Server error. Please try again.");
        return;
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        Alert.alert("Error", "Invalid response from server");
        return;
      }

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
      console.error("Lookup error:", error);
      Alert.alert("Error", "Failed to lookup user");
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

      const responseText = await response.text();
      
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        Alert.alert("Server Error", "Server error during transfer");
        return;
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        Alert.alert("Error", "Invalid response from server");
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
      Alert.alert("Error", "Transfer failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ 
        headerShown: false,
        statusBarStyle: 'light',
      }} />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#185FA5', '#0F4A7A']}
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
          <Text style={styles.headerTitle}>Transfer Money</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Content Sheet */}
      <View style={styles.contentSheet}>
        <View style={styles.dragPill} />

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
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {/* Recipient Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Send To</Text>
                
                <View style={styles.phoneInputContainer}>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter recipient's phone number"
                      placeholderTextColor="#9CA3AF"
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
                    <LinearGradient
                      colors={['#185FA5', '#0F4A7A']}
                      style={styles.avatarGradient}
                    >
                      <Text style={styles.avatarText}>
                        {beneficiary.name.charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>
                    <View style={styles.beneficiaryInfo}>
                      <Text style={styles.beneficiaryName}>{beneficiary.name}</Text>
                      <Text style={styles.beneficiaryPhone}>{beneficiary.phone}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              {/* Amount Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Amount</Text>
                <View style={styles.amountWrapper}>
                  <Text style={styles.currencySymbol}>₦</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.divider} />

              {/* Note Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Note (Optional)</Text>
                <View style={styles.noteWrapper}>
                  <Ionicons name="create-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Add a note for this transfer"
                    placeholderTextColor="#9CA3AF"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Transfer Button */}
              <TouchableOpacity
                style={[
                  styles.transferButton,
                  (!beneficiary || !amount || loading) && styles.transferButtonDisabled,
                ]}
                onPress={handleTransfer}
                disabled={!beneficiary || !amount || loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={(!beneficiary || !amount) ? ['#D1D5DB', '#D1D5DB'] : ['#185FA5', '#0F4A7A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.transferButtonText}>
                        Transfer ₦{amount ? parseFloat(amount).toLocaleString() : "0"}
                      </Text>
                      <Ionicons name="send-outline" size={18} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Security Note */}
              <View style={styles.securityNote}>
                <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
                <Text style={styles.securityText}>
                  Transfers are instant and secure
                </Text>
              </View>

              {/* Bottom padding */}
              <View style={styles.bottomPadding} />
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    color: '#fff',
  },
  placeholder: {
    width: 38,
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
    marginBottom: 16,
  },
  
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Section
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  divider: {
    height: 0.5,
    backgroundColor: '#F0F0F0',
    marginVertical: 20,
  },
  
  // Phone Input
  phoneInputContainer: {
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  verifyButton: {
    backgroundColor: '#185FA5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  verifyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  
  // Beneficiary Card
  beneficiaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 12,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  beneficiaryPhone: {
    fontSize: 13,
    color: "#6B7280",
  },
  
  // Amount
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: "#185FA5",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "600",
    color: '#111827',
  },
  
  // Note
  noteWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
  },
  noteInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    minHeight: 80,
  },
  
  // Transfer Button
  transferButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
  },
  transferButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  transferButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Security Note
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  securityText: {
    fontSize: 12,
    color: "#6B7280",
  },
  
  bottomPadding: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});