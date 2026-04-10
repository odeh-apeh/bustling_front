import React, { useState, useEffect, useRef } from "react";
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
  Image,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";

const { width } = Dimensions.get("window");
const isIOS = Platform.OS === 'ios';

export default function LoginScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordScreen, setShowPasswordScreen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const {showToast} = useToast();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadSavedPhone();
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

  const loadSavedPhone = async () => {
    try {
      const savedPhone = await AsyncStorage.getItem('userPhone');
      if (savedPhone) {
        setUserPhone(savedPhone);
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
        setPassword("");
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

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    if (phone.length > 8) {
      return `${phone.slice(0, 4)}****${phone.slice(-4)}`;
    }
    return phone;
  };

  // Phone input screen
  if (!showPasswordScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false, statusBarStyle: 'dark' }} />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoCircle}>
                <LinearGradient
                  colors={['#185FA5', '#0F4A7A']}
                  style={styles.logoGradient}
                >
                  <Ionicons name="person" size={50} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.appTitle}>Bustling</Text>
              <Text style={styles.appSubtitle}>Your trusted marketplace</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>Enter your phone number to continue</Text>
              
              <View style={styles.form}>
                {/* Phone Input with Icon */}
                <View style={[styles.inputWrapper, phoneFocused && styles.inputWrapperFocused]}>
                  <Ionicons name="call-outline" size={20} color={phoneFocused ? "#185FA5" : "#9CA3AF"} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={userPhone}
                    onChangeText={setUserPhone}
                    //onFocus={() => setPhoneFocused(true)}
                    // onBlur={() => setPhoneFocused(false)}
                    //autoFocus={true}
                  />
                  {userPhone.length > 0 && (
                    <TouchableOpacity onPress={() => setUserPhone("")}>
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity 
                    style={[styles.button, !userPhone && styles.disabledButton]} 
                    onPress={handlePhoneContinue}
                    onPressIn={handleButtonPressIn}
                    onPressOut={handleButtonPressOut}
                    disabled={!userPhone}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={!userPhone ? ['#D1D5DB', '#D1D5DB'] : ['#185FA5', '#0F4A7A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.buttonText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  onPress={() => router.push('/login/ForgotPasswordScreen')}
                  style={styles.linkWrapper}
                >
                  <Ionicons name="lock-closed-outline" size={16} color="#185FA5" />
                  <Text style={styles.linkText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/signup/SignupScreen")}
                  style={styles.linkWrapper}
                >
                  <Ionicons name="person-add-outline" size={16} color="#185FA5" />
                  <Text style={styles.linkText}>Don&apos;t have an account? Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer Note */}
            <Text style={styles.footerNote}>
              By continuing, you agree to our Terms of Service
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Password screen
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false, statusBarStyle: 'dark' }} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
            {/* Back Button */}
            <TouchableOpacity onPress={handleChangePhone} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#185FA5" />
            </TouchableOpacity>

            {/* Logo Section */}
            <View style={styles.logoSectionSmall}>
              <View style={styles.logoCircleSmall}>
                <LinearGradient
                  colors={['#185FA5', '#0F4A7A']}
                  style={styles.logoGradientSmall}
                >
                  <Ionicons name="person" size={32} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.appTitleSmall}>Welcome Back!</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              {/* User Info Display */}
              <View style={styles.userInfoCard}>
                
                <Text style={styles.userPhoneDisplay}>{formatPhoneNumber(userPhone)}</Text>
                <TouchableOpacity onPress={handleChangePhone} style={styles.changePhoneLink}>
                  <Ionicons name="create-outline" size={14} color="#185FA5" />
                  <Text style={styles.changePhoneText}>Change Phone</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formSubtitle}>Enter your password to continue</Text>

              <View style={styles.form}>
                {/* Password Input with Eye Icon */}
                <View style={[styles.passwordContainer, passwordFocused && styles.inputWrapperFocused]}>
                  <Ionicons name="lock-closed-outline" size={20} color={passwordFocused ? "#185FA5" : "#9CA3AF"} style={styles.inputIcon} />
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    //onFocus={() => setPasswordFocused(true)}
                   // onBlur={() => setPasswordFocused(false)}
                    //autoFocus={true}
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon}
                    onPress={togglePasswordVisibility}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                </View>

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity 
                    style={[styles.button, (isLoading || !password) && styles.disabledButton]} 
                    onPress={handleLogin}
                    onPressIn={handleButtonPressIn}
                    onPressOut={handleButtonPressOut}
                    disabled={isLoading || !password}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={!password ? ['#D1D5DB', '#D1D5DB'] : ['#185FA5', '#0F4A7A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Login</Text>
                          <Ionicons name="log-in-outline" size={18} color="#fff" />
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
                  onPress={() => router.push('/login/ForgotPasswordScreen')}
                  style={styles.linkWrapper}
                >
                  <Ionicons name="lock-closed-outline" size={16} color="#185FA5" />
                  <Text style={styles.linkText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/signup/SignupScreen")}
                  style={styles.linkWrapper}
                >
                  <Ionicons name="person-add-outline" size={16} color="#185FA5" />
                  <Text style={styles.linkText}>Don&apos;t have an account? Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  
  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
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
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  // Logo Section Small
  logoSectionSmall: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoCircleSmall: {
    width: 56,
    height: 56,
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#185FA5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  logoGradientSmall: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitleSmall: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  
  // Back Button
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  // Form Card
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  
  // User Info Card
  userInfoCard: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  userPhoneDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  changePhoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changePhoneText: {
    fontSize: 13,
    color: '#185FA5',
    fontWeight: '500',
  },
  
  // Form
  form: {
    width: '100%',
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
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
  
  // Password Container
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: '#111827',
  },
  eyeIcon: {
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  
  // Button
  button: {
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  
  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  
  // Links
  linkWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  linkText: {
    color: '#185FA5',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Footer Note
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 24,
  },
});