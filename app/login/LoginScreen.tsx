import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordScreen, setShowPasswordScreen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {showToast} = useToast();

  // Load saved phone number when component mounts
  useEffect(() => {
    loadSavedPhone();
    // DON'T check auth status here - we always show login screen
  }, []);

  const loadSavedPhone = async () => {
    try {
      const savedPhone = await AsyncStorage.getItem('userPhone');
      if (savedPhone) {
        setUserPhone(savedPhone);
        // Auto-show password screen if phone exists (like Opay)
        setShowPasswordScreen(true);
      }
    } catch (error) {
      console.log('Error loading saved phone:', error);
    }
  };

  const savePhone = async (phone: string) => {
    try {
      await AsyncStorage.setItem('userPhone', phone);
    } catch (error) {
      console.log('Error saving phone:', error);
    }
  };

  const handlePhoneContinue = () => {
    if (!userPhone) {
      showToast("Please enter your phone number", "error");
      return;
    }

    // Save phone and proceed to password screen
    savePhone(userPhone);
    setShowPasswordScreen(true);
  };

  const handleLogin = async () => {
    try {
      if (!userPhone || !password) {
        showToast("Please enter your password", "error");
        return;
      }

      setIsLoading(true);

      console.log('📤 Sending login request with:', { phone: userPhone });

      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          phone: userPhone,
          password: password,
        }),
      });

      const data = await response.json();
      console.log('📦 Login response:', data);
      
      if (data.success) {
        // Login successful - clear password for security
        setPassword("");
        
        // Navigate to home - user stays logged in until they close the app
        router.replace("/home/Homescreen");
        await AsyncStorage.setItem('user_id', data.userId.toString());
      } else {
        showToast(data.message || "Invalid phone number or password", "error");
      }
      
    } catch (error: any) {
      console.error('💥 Login error:', error);
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePhone = () => {
    setShowPasswordScreen(false);
    setPassword("");
    setShowPassword(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Phone input screen
  if (!showPasswordScreen) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.header}>Welcome to Bustling</Text>
        <Text style={styles.subText}>Enter your phone number to continue</Text>
        
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={userPhone}
            onChangeText={setUserPhone}
            autoFocus={true}
          />

          <TouchableOpacity 
            style={[styles.button, !userPhone && styles.disabledButton]} 
            onPress={handlePhoneContinue}
            disabled={!userPhone}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
              onPress={() => router.push('/login/ForgotPasswordScreen')}
              style={{ marginTop: 15 }}
            >
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/signup/SignupScreen")}
            style={{ marginTop: 15 }}
          >
            <Text style={styles.linkText}>Don&apos;t have an account? Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Password screen
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.header}>Welcome Back!</Text>
          
          {/* Show user's phone number */}
          <View style={styles.phoneDisplay}>
            <Text style={styles.phoneLabel}>Logging in as:</Text>
            <Text style={styles.phoneNumber}>{userPhone}</Text>
            <TouchableOpacity 
              onPress={handleChangePhone}
              style={styles.changePhoneButton}
            >
              <Text style={styles.changePhoneText}>Change Phone</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subText}>Enter your password to continue</Text>

          <View style={styles.form}>
            {/* Password Input with Eye Icon */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoFocus={true}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={togglePasswordVisibility}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.button, (isLoading || !password) && styles.disabledButton]} 
              onPress={handleLogin}
              disabled={isLoading || !password}
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Logging in..." : "Login"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/login/ForgotPasswordScreen')}
              style={{ marginTop: 15 }}
            >
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/signup/SignupScreen")}
              style={{ marginTop: 10 }}
            >
              <Text style={styles.linkText}>Don&apos;t have an account? Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
      </KeyboardAvoidingView>
    </>
  );
}


const colors = {
  primary: "#0A6BFF",
  primaryLight: "#EBF2FF",
  primaryMid: "#D0E4FF",
  primaryFaint: "#F5F9FF",
  text: "#224fc3",
  textSecondary: "#5A6A85",
  textMuted: "#9AAAC0",
  surface: "#FFFFFF",
  surfaceInput: "#F4F7FB",
  surfaceCard: "#F8FAFD",
  border: "#E4EBF5",
  borderFocus: "#0A6BFF",
};

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.6,
  },
  subText: {
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: 30,
    textAlign: "center",
    lineHeight: 22,
  },

  phoneDisplay: {
    alignItems: "center",
    marginBottom: 24,
    padding: 18,
    backgroundColor: colors.primaryFaint,
    borderRadius: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  phoneLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: "600",
  },
  phoneNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  changePhoneButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  changePhoneText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },

  form: {
    width: width * 0.88,
    alignItems: "center",
    gap: 12,
  },
  input: {
    width: "100%",
    backgroundColor: colors.surfaceInput,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    letterSpacing: 0.1,
  },
  inputFocused: {
    borderColor: colors.borderFocus,
    backgroundColor: colors.surface,
  },

  passwordContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceInput,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  passwordContainerFocused: {
    borderColor: colors.borderFocus,
    backgroundColor: colors.surface,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
  eyeIcon: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  button: {
    width: "100%",
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#0A6BFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  disabledButton: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  disabledButtonText: {
    color: colors.textMuted,
  },

  linkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 30,
    marginTop: -2,
  },
});