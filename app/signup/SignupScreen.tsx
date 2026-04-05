import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "@/helpers/core-service";

const { width } = Dimensions.get("window");

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

  // Fetch location on mount
  useEffect(() => {
    getCurrentLocation();
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
      Alert.alert(
        "Location Error",
        "Unable to get location. You can manually enter your city."
      );
    } finally {
      setGettingLocation(false);
    }
  };

  const handleManualLocationSubmit = () => {
    if (!manualLocationInput.trim()) {
      Alert.alert("Error", "Please enter a valid location.");
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
        Alert.alert("Success", "Account created successfully!");
        router.replace("/home/Homescreen");
      } else {
        Alert.alert("Signup Failed", data.message || "Something went wrong.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Network error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Manual Location Modal */}
      <Modal transparent visible={manualLocationVisible} animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Enter Location</Text>

            <TextInput
              placeholder="City, State"
              placeholderTextColor="#999"
              style={styles.modalInput}
              value={manualLocationInput}
              onChangeText={setManualLocationInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setManualLocationVisible(false)}
                style={[styles.modalBtn, { backgroundColor: "#ccc" }]}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleManualLocationSubmit}
                style={[styles.modalBtn, { backgroundColor: "#0A6BFF" }]}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.header}>Create Account</Text>
          <Text style={styles.subText}>Sign up to get started with Errandly</Text>

          {/* Location Banner */}
          <View
            style={[
              styles.locationBanner,
              !form.location && styles.locationBannerWarning,
            ]}
          >
            <Ionicons
              name={form.latitude ? "location" : "location-outline"}
              size={22}
              color={form.latitude ? "#4CAF50" : "#FF9800"}
            />

            <View style={styles.locationTextContainer}>
              <Text style={styles.locationTitle}>
                {form.location ? "Location Detected" : "Getting Location..."}
              </Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {form.location || "Please wait"}
              </Text>
            </View>

            {gettingLocation ? (
              <ActivityIndicator size="small" />
            ) : (
              <TouchableOpacity onPress={() => getCurrentLocation()}>
                <Ionicons name="refresh" size={20} color="#0A6BFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              placeholderTextColor="#999"
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number *"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => setForm({ ...form, phone: v })}
            />

            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
            />

            <TextInput
              style={styles.input}
              placeholder="Type (user/seller/delivery)"
              placeholderTextColor="#999"
              value={form.type}
              onChangeText={(v) => setForm({ ...form, type: v })}
            />

            <TextInput
              style={styles.input}
              placeholder="Password *"
              placeholderTextColor="#999"
              secureTextEntry
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
            />

            {/* Manual Location Button */}
            <TouchableOpacity
              style={styles.manualLocationButton}
              onPress={() => setManualLocationVisible(true)}
            >
              <Ionicons name="create-outline" size={16} color="#0A6BFF" />
              <Text style={styles.manualLocationText}>
                {form.location ? "Change Location" : "Enter Location Manually"}
              </Text>
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.signupButton,
                isLoading && { backgroundColor: "#999" },
              ]}
              disabled={isLoading}
              onPress={handleSignup}
            >
              <Text style={styles.signupText}>
                {isLoading ? "Creating Account..." : "Sign Up"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/login/LoginScreen")}
              style={{ marginTop: 10 }}
            >
              <Text style={styles.linkText}>Already have an account? Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0A6BFF",
    marginBottom: 5,
  },
  subText: {
    fontSize: 15,
    color: "#666",
    marginBottom: 20,
  },
  locationBanner: {
    width: width * 0.88,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F4FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  locationBannerWarning: {
    backgroundColor: "#FFF7E0",
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  locationText: {
    fontSize: 12,
    color: "#666",
  },
  form: {
    width: width * 0.88,
    alignItems: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#F3F6F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  manualLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E8F4FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  manualLocationText: {
    marginLeft: 5,
    color: "#0A6BFF",
    fontSize: 14,
  },
  signupButton: {
    width: "100%",
    backgroundColor: "#0A6BFF",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  signupText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  linkText: {
    color: "#0A6BFF",
    fontSize: 14,
    textDecorationLine: "underline",
  },

  // Modal styles
  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
  },
  modalInput: {
    backgroundColor: "#F3F6F8",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
