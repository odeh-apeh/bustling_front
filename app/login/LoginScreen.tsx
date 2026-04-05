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
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "@/helpers/core-service";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordScreen, setShowPasswordScreen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      Alert.alert("Error", "Please enter your phone number");
      return;
    }

    // Save phone and proceed to password screen
    savePhone(userPhone);
    setShowPasswordScreen(true);
  };

  const handleLogin = async () => {
    try {
      if (!userPhone || !password) {
        Alert.alert("Error", "Please enter your password");
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
      } else {
        Alert.alert("Login Failed", data.message || "Invalid phone number or password");
      }
      
    } catch (error: any) {
      console.error('💥 Login error:', error);
      Alert.alert("Error", error.message || "Network error. Please try again.");
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
        <Text style={styles.header}>Welcome to Errandly</Text>
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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0A6BFF",
    marginBottom: 6,
    textAlign: "center",
  },
  subText: {
    color: "#666",
    fontSize: 15,
    marginBottom: 25,
    textAlign: "center",
  },
  phoneDisplay: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    width: '100%',
  },
  phoneLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A6BFF',
    marginBottom: 10,
  },
  changePhoneButton: {
    padding: 5,
  },
  changePhoneText: {
    color: '#0A6BFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  form: {
    width: width * 0.85,
    alignItems: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#F6F8FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  passwordContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F8FA",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F6F8FA",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  eyeIcon: {
    padding: 12,
  },
  button: {
    width: "100%",
    backgroundColor: "#0A6BFF",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  linkText: {
    color: "#0A6BFF",
    textDecorationLine: "underline",
    fontSize: 14,
  },
});