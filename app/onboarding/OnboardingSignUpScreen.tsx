import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useRef, useEffect } from "react";
import {
  Animated,
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const OnBoardingSignUpScreen: React.FC = () => {
  const router = useRouter();

  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Smooth intro animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleSignUp = async () => {
    await AsyncStorage.setItem("hasCompletedOnboarding", "true");
    router.push("/signup/SignupScreen");
  };

  const handleLogin = async () => {
    await AsyncStorage.setItem("hasCompletedOnboarding", "true");
    router.push("/login/LoginScreen");
  };

  const handleAdminSupport = async () => {
    await AsyncStorage.setItem("hasCompletedOnboarding", "true");
    router.push("/auth/account-support");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoSlide}>
        <Animated.View
          style={[
            styles.logoContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <Image
              source={require("../../assets/images/bustling.jpeg")}
              style={styles.imageLogo}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.logoTitle}>Bustling</Text>
          <Text style={styles.logoText}>
            Get everything you want in just one click.
          </Text>

          {/* SIGN UP */}
          <Animated.View style={styles.animatedWrapper}>
            <TouchableOpacity
              style={styles.signupButton}
              onPress={handleSignUp}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#185FA5", "#0F4A7A"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Sign Up</Text>
                <Ionicons name="person-add-outline" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* LOGIN */}
          <Animated.View style={styles.animatedWrapper}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#fff", "#fff"]}
                style={styles.loginButtonGradient}
              >
                <Ionicons name="log-in-outline" size={18} color="#185FA5" />
                <Text style={styles.loginButtonText}>Login</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* SUPPORT */}
          <TouchableOpacity
            style={styles.adminSupportButton}
            onPress={handleAdminSupport}
          >
            <Ionicons name="headset-outline" size={18} color="#9CA3AF" />
            <Text style={styles.adminSupportText}>Account Support</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default OnBoardingSignUpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  logoSlide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  logoContent: {
    alignItems: "center",
    width: "100%",
  },

  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#185FA5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  imageLogo: {
    width: "100%",
    height: "100%",
  },

  logoTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  logoText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },

  animatedWrapper: {
    transform: [{ scale: 1 }],
    width: "100%",
    alignItems: "center",
  },

  signupButton: {
    width: "80%",
    borderRadius: 14,
    marginBottom: 14,
    overflow: "hidden",
  },

  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },

  loginButton: {
    width: "80%",
    borderRadius: 14,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#185FA5",
  },

  loginButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  loginButtonText: {
    color: "#185FA5",
    fontWeight: "700",
    fontSize: 16,
  },

  adminSupportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginTop: 20,
    gap: 6,
  },

  adminSupportText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
  },
});