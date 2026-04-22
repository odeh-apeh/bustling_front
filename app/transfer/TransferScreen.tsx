// app/transfer/TransferScreen.tsx
import { BASE_URL } from "@/helpers/core-service";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ConfirmationModal from "../modal";
import { useToast } from "@/contexts/toast-content";

const { width } = Dimensions.get("window");

interface Beneficiary {
  id: number;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
}

export default function TransferScreen() {
  const router = useRouter();
  const [recipientPhone, setRecipientPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [recentBeneficiaries, setRecentBeneficiaries] = useState<Beneficiary[]>(
    [],
  );
  const [open, setOpen] = useState(false);
  const [modalMessages, setModalMessages] = useState({
    title: '',
    message: '',
    variant: 'primary' as 'primary' | 'danger' | 'success',
    onclick: () => {},
    onCancel: () => {
      setOpen(false);
    },
  });
  const {showToast} = useToast();

  // Animation values - only for initial mount
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Only run entrance animation once on mount
    fadeAnim.setValue(1);
  }, []);

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const lookupUser = async () => {
    if (!recipientPhone.trim()) {
      showToast("Please enter a phone number",'error');
      return;
    }

    setSearching(true);
    try {
      const url = `${BASE_URL}/api/transfer/lookup?phone=${encodeURIComponent(recipientPhone)}`;

      const response = await fetch(url, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const responseText = await response.text();

      if (
        responseText.includes("<!DOCTYPE") ||
        responseText.includes("<html")
      ) {
        showToast("Server error. Please try again.", 'error');
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        showToast("Invalid response from server", 'error');
        return;
      }

      if (response.status === 401) {
        showToast("Session expired. Please login again.", 'error');
        router.push("/login/LoginScreen");
        return;
      }

      if (data.success) {
        setBeneficiary(data.user);
      } else {
        setBeneficiary(null);
        showToast("User not found", 'error');
      }
    } catch (error: any) {
      console.error("Lookup error:", error);
      showToast("Failed to lookup user", 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleTransfer = async () => {
    if (!beneficiary) {
      showToast("Please verify recipient first", 'error');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      showToast("Please enter a valid amount", 'error');
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum < 100) {
      showToast("Minimum transfer amount is ₦100", 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/transfer/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          recipientPhone: beneficiary.phone,
          amount: amountNum,
          note: note.trim(),
        }),
      });

      const responseText = await response.text();

      if (
        responseText.includes("<!DOCTYPE") ||
        responseText.includes("<html")
      ) {
        showToast("Server error during transfer", 'error');
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        showToast("Invalid response from server", 'error');
        return;
      }

      if (data.success) {
        setOpen(true);
        setModalMessages({
          title: "Transfer Successful!",
          message: `₦${amountNum.toLocaleString()} sent to ${beneficiary.name}`,
          variant: "success",
          onclick: () => {
            setOpen(false);
            router.push("/transfer/TransferHistoryScreen");
          },
          onCancel: () => {
            setOpen(false);
            router.back();
          },
        });
      } else {
        showToast(data.message || "Transfer failed", 'error');
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      showToast("Transfer failed. Please try again.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name?.charAt(0).toUpperCase() || "U";
  };

  const getRandomColor = (id: number) => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7B731",
    ];
    return colors[id % colors.length];
  };

  const formatAmountPreview = () => {
    if (!amount) return "0";
    return parseFloat(amount).toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen
        options={{
          headerShown: false,
          statusBarStyle: "light",
        }}
      />

      {/* Header with Gradient */}
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
          <Text style={styles.headerTitle}>Send Money</Text>
          <TouchableOpacity
            onPress={() => router.push("/transfer/TransferHistoryScreen")}
            style={styles.historyButton}
          >
            <Ionicons name="time-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{height:20}} />
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
            {/* Removed Animated.View wrapper to prevent twitching */}
            <View>
              {/* Recipient Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person-outline" size={18} color="#185FA5" />
                  <Text style={styles.sectionLabel}>Recipient</Text>
                </View>

                <View style={styles.phoneInputContainer}>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter phone number"
                      placeholderTextColor="#9CA3AF"
                      value={recipientPhone}
                      onChangeText={(text) => {
                        setRecipientPhone(text);
                        if (beneficiary) setBeneficiary(null);
                      }}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                    />
                    {recipientPhone.length > 0 && (
                      <TouchableOpacity onPress={() => setRecipientPhone("")}>
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.verifyButton,
                      searching && styles.verifyButtonDisabled,
                    ]}
                    onPress={lookupUser}
                    disabled={searching || !recipientPhone.trim()}
                  >
                    {searching ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name="search-outline"
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.verifyButtonText}>Verify</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {beneficiary && (
                  <View style={styles.beneficiaryCard}>
                    <LinearGradient
                      colors={[
                        getRandomColor(beneficiary.id),
                        getRandomColor(beneficiary.id + 1),
                      ]}
                      style={styles.avatarGradient}
                    >
                      <Text style={styles.avatarText}>
                        {getInitials(beneficiary.name)}
                      </Text>
                    </LinearGradient>
                    <View style={styles.beneficiaryInfo}>
                      <Text style={styles.beneficiaryName}>
                        {beneficiary.name}
                      </Text>
                      <Text style={styles.beneficiaryPhone}>
                        {beneficiary.phone}
                      </Text>
                    </View>
                    <View style={styles.verifiedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#4CAF50"
                      />
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              {/* Amount Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="cash-outline" size={18} color="#185FA5" />
                  <Text style={styles.sectionLabel}>Amount</Text>
                </View>

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

                {amount && parseFloat(amount) > 0 && (
                  <View style={styles.amountPreview}>
                    <Text style={styles.amountPreviewLabel}>
                      You&apos;re sending
                    </Text>
                    <Text style={styles.amountPreviewValue}>
                      ₦{formatAmountPreview()}
                    </Text>
                  </View>
                )}

                {/* Suggested Amounts */}
                <View style={styles.suggestedAmounts}>
                  {[1000, 5000, 10000, 20000].map((suggested) => (
                    <TouchableOpacity
                      key={suggested}
                      style={[
                        styles.suggestedAmount,
                        parseFloat(amount) === suggested &&
                          styles.suggestedAmountActive,
                      ]}
                      onPress={() => setAmount(suggested.toString())}
                    >
                      <Text
                        style={[
                          styles.suggestedAmountText,
                          parseFloat(amount) === suggested &&
                            styles.suggestedAmountTextActive,
                        ]}
                      >
                        ₦{suggested.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Note Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="create-outline" size={18} color="#185FA5" />
                  <Text style={styles.sectionLabel}>Note (Optional)</Text>
                </View>

                <View style={styles.noteWrapper}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={20}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Add a message for the recipient"
                    placeholderTextColor="#9CA3AF"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Transfer Summary */}
              {beneficiary && amount && parseFloat(amount) > 0 && (
                <View style={styles.transferSummary}>
                  <Text style={styles.summaryTitle}>Transfer Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount</Text>
                    <Text style={styles.summaryValue}>
                      ₦{formatAmountPreview()}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Fee</Text>
                    <Text style={styles.summaryValue}>₦0.00</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryTotalLabel}>Total</Text>
                    <Text style={styles.summaryTotalValue}>
                      ₦{formatAmountPreview()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Transfer Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.transferButton,
                    (!beneficiary || !amount || loading) &&
                      styles.transferButtonDisabled,
                  ]}
                  onPress={handleTransfer}
                  disabled={!beneficiary || !amount || loading}
                  onPressIn={handleButtonPressIn}
                  onPressOut={handleButtonPressOut}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      !beneficiary || !amount
                        ? ["#D1D5DB", "#D1D5DB"]
                        : ["#185FA5", "#0F4A7A"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send-outline" size={20} color="#fff" />
                        <Text style={styles.transferButtonText}>
                          Send ₦
                          {amount ? parseFloat(amount).toLocaleString() : "0"}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Security Note */}
              <View style={styles.securityNote}>
                <View style={styles.securityIconContainer}>
                  <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
                </View>
                <Text style={styles.securityText}>
                  Your transaction is secured with escrow protection
                </Text>
              </View>

              {/* Bottom padding */}
              <View style={styles.bottomPadding} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      
      <ConfirmationModal 
        visible={open} 
        onCancel={modalMessages.onCancel}
        message={modalMessages.message} 
        title={modalMessages.title}
        variant={modalMessages.variant} 
        onConfirm={modalMessages.onclick}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1923",
  },

  // Header Gradient
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
  historyButton: {
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
  balancePreview: {
    marginTop: 20,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  balancePreviewLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  balancePreviewAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },

  // Content Sheet
  contentSheet: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  divider: {
    height: 0.5,
    backgroundColor: "#F0F0F0",
    marginVertical: 20,
  },

  // Phone Input
  phoneInputContainer: {
    flexDirection: "row",
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
  },
  verifyButton: {
    backgroundColor: "#185FA5",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    gap: 6,
  },
  verifyButtonDisabled: {
    backgroundColor: "#9CA3AF",
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
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
    fontSize: 12,
    color: "#6B7280",
  },
  verifiedBadge: {
    width: 30,
    alignItems: "flex-end",
  },

  // Amount
  amountWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "700",
    color: "#185FA5",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: "600",
    color: "#111827",
  },
  amountPreview: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    alignItems: "center",
  },
  amountPreviewLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  amountPreviewValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#185FA5",
  },
  suggestedAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  suggestedAmount: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  suggestedAmountActive: {
    backgroundColor: "#185FA5",
    borderColor: "#185FA5",
  },
  suggestedAmountText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  suggestedAmountTextActive: {
    color: "#fff",
  },

  // Note
  noteWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
  },
  noteInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
    minHeight: 80,
  },

  // Transfer Summary
  transferSummary: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  summaryDivider: {
    height: 0.5,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#185FA5",
  },

  // Transfer Button
  transferButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  transferButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
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
    gap: 8,
    paddingVertical: 12,
  },
  securityIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  securityText: {
    fontSize: 11,
    color: "#6B7280",
  },

  bottomPadding: {
    height: Platform.OS === "ios" ? 40 : 20,
  },
});