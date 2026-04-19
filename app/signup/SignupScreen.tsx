import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";

const { width } = Dimensions.get("window");
const isIOS = Platform.OS === 'ios';

interface FormState {
  name: string;
  phone: string;
  email: string;
  type: string;
  password: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

export default function SignupScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(true);
  const [manualLocationVisible, setManualLocationVisible] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState("");
  const {showToast} = useToast();
  
  // Focus states for inputs
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    email: "",
    type: "",
    password: "",
    location: "",
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    getCurrentLocation();
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

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);

      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location Permission Needed",
          "Allow location for better service matching.",
          [
            { text: "Try Again", onPress: () => getCurrentLocation() },
            { text: "Continue Without", style: "cancel" },
          ]
        );
        setGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const loc =
        `${address.city || ""}${address.region ? ", " + address.region : ""}${
          address.country ? ", " + address.country : ""
        }`.trim() || "Current Location";

      setForm((prev) => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        location: loc,
      }));
    } catch (err) {
      showToast(
        "Unable to get location. You can manually enter your city.",
        "error"
      );
    } finally {
      setGettingLocation(false);
    }
  };

  const handleManualLocationSubmit = () => {
    if (!manualLocationInput.trim()) {
      showToast("Please enter a valid location.", "error");
      return;
    }

    setForm((prev) => ({
      ...prev,
      location: manualLocationInput.trim(),
      latitude: null,
      longitude: null,
    }));

    setManualLocationVisible(false);
  };

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

  const handleSignup = () => {
    if (!form.name || !form.phone || !form.password) {
      Alert.alert("Error", "Full name, phone, and password are required.");
      return;
    }

    if (!form.location) {
      Alert.alert(
        "Location Recommended",
        "Location improves service matching.",
        [
          { text: "Enter Manually", onPress: () => setManualLocationVisible(true) },
          { text: "Continue", onPress: () => proceedSignup() },
        ]
      );
      return;
    }

    proceedSignup();
  };

  const proceedSignup = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(
        `${BASE_URL}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (data.success) {
        showToast("Account created successfully!", "success");
        router.replace("/home/Homescreen");
      } else {
        showToast(data.message || "Something went wrong.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, statusBarStyle: 'dark' }} />

      {/* Manual Location Modal */}
      <Modal transparent visible={manualLocationVisible} animationType="slide">
        <View style={styles.modalWrap}>
          <Animated.View style={[styles.modalBox, { transform: [{ scale: buttonScale }] }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="location-outline" size={24} color="#185FA5" />
              </View>
              <Text style={styles.modalTitle}>Enter Location</Text>
              <Text style={styles.modalSubtitle}>Please enter your city and state</Text>
            </View>

            <TextInput
              placeholder="City, State"
              placeholderTextColor="#9CA3AF"
              style={styles.modalInput}
              value={manualLocationInput}
              onChangeText={setManualLocationInput}
              autoFocus={true}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setManualLocationVisible(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleManualLocationSubmit}
                style={styles.modalSaveBtn}
              >
                <LinearGradient
                  colors={['#185FA5', '#0F4A7A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalSaveGradient}
                >
                  <Text style={styles.modalSaveText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              style={[
                styles.contentWrapper,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }
              ]}
            >
              {/* Header */}
              <View style={styles.headerSection}>
                <View style={styles.logoCircle}>
                  <LinearGradient
                    colors={['#185FA5', '#0F4A7A']}
                    style={styles.logoGradient}
                  >
                    <Ionicons name="person-add-outline" size={40} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.header}>Create Account</Text>
                <Text style={styles.subText}>Sign up to get started with Bustling</Text>
              </View>

              {/* Location Banner */}
              <TouchableOpacity
                style={[
                  styles.locationBanner,
                  !form.location && styles.locationBannerWarning,
                ]}
                onPress={() => getCurrentLocation()}
                activeOpacity={0.8}
              >
                <View style={styles.locationIconContainer}>
                  <Ionicons
                    name={form.latitude ? "location" : "location-outline"}
                    size={22}
                    color={form.latitude ? "#4CAF50" : "#FF9800"}
                  />
                </View>

                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationTitle}>
                    {form.location ? "Location Detected" : "Getting Location..."}
                  </Text>
                  <Text style={styles.locationText} numberOfLines={1}>
                    {form.location || "Please wait"}
                  </Text>
                </View>

                {gettingLocation ? (
                  <ActivityIndicator size="small" color="#185FA5" />
                ) : (
                  <Ionicons name="refresh" size={20} color="#185FA5" />
                )}
              </TouchableOpacity>

              {/* Form */}
              <View style={styles.form}>
                {/* Name Input */}
                <View style={[styles.inputWrapper, focusedField === 'name' && styles.inputWrapperFocused]}>
                  <Ionicons name="person-outline" size={20} color={focusedField === 'name' ? "#185FA5" : "#9CA3AF"} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name *"
                    placeholderTextColor="#9CA3AF"
                    value={form.name}
                    onChangeText={(v) => setForm({ ...form, name: v })}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                {/* Phone Input */}
                <View style={[styles.inputWrapper, focusedField === 'phone' && styles.inputWrapperFocused]}>
                  <Ionicons name="call-outline" size={20} color={focusedField === 'phone' ? "#185FA5" : "#9CA3AF"} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number *"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={form.phone}
                    onChangeText={(v) => setForm({ ...form, phone: v })}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                {/* Email Input */}
                <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputWrapperFocused]}>
                  <Ionicons name="mail-outline" size={20} color={focusedField === 'email' ? "#185FA5" : "#9CA3AF"} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    value={form.email}
                    onChangeText={(v) => setForm({ ...form, email: v })}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                {/* Type Input */}
                <View style={[styles.inputWrapper, focusedField === 'type' && styles.inputWrapperFocused]}>
                  <Ionicons name="briefcase-outline" size={20} color={focusedField === 'type' ? "#185FA5" : "#9CA3AF"} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Account Type (user/seller/delivery)"
                    placeholderTextColor="#9CA3AF"
                    value={form.type}
                    onChangeText={(v) => setForm({ ...form, type: v })}
                    onFocus={() => setFocusedField('type')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                {/* Password Input */}
                <View style={[styles.inputWrapper, focusedField === 'password' && styles.inputWrapperFocused]}>
                  <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'password' ? "#185FA5" : "#9CA3AF"} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password *"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    value={form.password}
                    onChangeText={(v) => setForm({ ...form, password: v })}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                {/* Manual Location Button */}
                <TouchableOpacity
                  style={styles.manualLocationButton}
                  onPress={() => setManualLocationVisible(true)}
                >
                  <Ionicons name="create-outline" size={16} color="#185FA5" />
                  <Text style={styles.manualLocationText}>
                    {form.location ? "Change Location" : "Enter Location Manually"}
                  </Text>
                </TouchableOpacity>

                {/* Submit Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
                  <TouchableOpacity
                    style={[
                      styles.signupButton,
                      isLoading && styles.disabledButton,
                    ]}
                    disabled={isLoading}
                    onPress={handleSignup}
                    onPressIn={handleButtonPressIn}
                    onPressOut={handleButtonPressOut}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isLoading ? ['#D1D5DB', '#D1D5DB'] : ['#185FA5', '#0F4A7A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.signupText}>Sign Up</Text>
                          <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  onPress={() => router.push("/login/LoginScreen")}
                  style={styles.loginLink}
                >
                  <Ionicons name="log-in-outline" size={16} color="#185FA5" />
                  <Text style={styles.linkText}>Already have an account? Log In</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  contentWrapper: {
    flex: 1,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#185FA5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 5,
    letterSpacing: -0.5,
  },
  subText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },
  
  // Location Banner
  locationBanner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6F1FB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  locationBannerWarning: {
    backgroundColor: "#FEF3E8",
    borderColor: "#FFE0B2",
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    color: "#6B7280",
  },
  
  // Form
  form: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    width: '100%',
  },
  inputWrapperFocused: {
    borderColor: '#185FA5',
    backgroundColor: '#fff',
    shadowColor: '#185FA5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: '#111827',
  },
  manualLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E6F1FB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  manualLocationText: {
    color: "#185FA5",
    fontSize: 13,
    fontWeight: "500",
  },
  
  // Signup Button
  signupButton: {
    width: "100%",
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  signupText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  disabledButton: {
    opacity: 0.6,
  },
  
  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: '#9CA3AF',
  },
  
  // Login Link
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  linkText: {
    color: "#185FA5",
    fontSize: 14,
    fontWeight: "500",
  },
  
  // Modal Styles
  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  modalCancelText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 14,
  },
  modalSaveBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSaveGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalSaveText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});