// app/onboarding/OnboardingScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import Swiper from "react-native-swiper";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function OnboardingScreen() {
  const router = useRouter();
  const swiperRef = useRef<Swiper>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoSlideRef = useRef<any>(null);

  // Auto-slide functionality
  useEffect(() => {
    // Start auto-sliding after component mounts
    startAutoSlide();
    
    return () => {
      // Clean up on unmount
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
      }
    };
  }, []);

  // Reset auto-slide timer when index changes
  useEffect(() => {
    // If we're on the last slide (logo slide), stop auto-sliding
    if (currentIndex === 2) {
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
      }
      return;
    }

    // Restart auto-slide timer when slide changes
    restartAutoSlide();
  }, [currentIndex]);

  const startAutoSlide = () => {
    autoSlideRef.current = setInterval(() => {
      handleAutoSlide();
    }, 3000); // Change slide every 3 seconds
  };

  const restartAutoSlide = () => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
    }
    startAutoSlide();
  };

  const handleAutoSlide = () => {
    if (swiperRef.current) {
      const nextIndex = currentIndex + 1;
      
      // If we're not on the last slide, go to next slide
      if (nextIndex < 3) {
        swiperRef.current.scrollBy(1);
      } else {
        // If we're on the last slide, stop auto-sliding
        if (autoSlideRef.current) {
          clearInterval(autoSlideRef.current);
        }
      }
    }
  };

  const handleIndexChanged = (index: number) => {
    setCurrentIndex(index);
  };

  const handleSignUp = async () => {
    // Stop auto-slide when user interacts
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
    }
    // Mark onboarding as completed
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    router.push("/signup/SignupScreen");
  };

  const handleLogin = async () => {
    // Stop auto-slide when user interacts
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
    }
    // Mark onboarding as completed
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    router.push("/login/LoginScreen");
  };



  return (
    <View style={styles.container}>
      {/* Blue curved background */}
      <View style={styles.topBackground} />

      <Swiper 
        ref={swiperRef}
        loop={false} 
        dotStyle={styles.dot} 
        activeDotStyle={styles.activeDot}
        onIndexChanged={handleIndexChanged}
        showsButtons={false}
      >
        {/* Slide 1 - has picture */}
        <View style={styles.slide}>
          <View style={styles.card}>
            <Image
              source={require("../../assets/images/hello.png")}
              style={styles.image}
              resizeMode="cover"
            />
            <Text style={styles.title}>Hello</Text>
            <Text style={styles.text}>
              Welcome to Bustling — buy from home, sell from home.
            </Text>
          </View>
        </View>

        {/* Slide 2 - has picture */}
        <View style={styles.slide}>
          <View style={styles.card}>
            <Image
              source={require("../../assets/images/ready.png")}
              style={styles.image}
              resizeMode="cover"
            />
            <Text style={styles.title}>Ready?</Text>
            <Text style={styles.text}>
              Track errands, manage tasks and payments — everything in one place.
            </Text>
          </View>
        </View>

        {/* Slide 3 - logo + buttons (no card) */}
        <View style={styles.logoSlide}>
          <Image
            // Replace with your logo if available
            source={require("../../assets/images/bustling.jpeg")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.logoTitle}>Bustling</Text>
          <Text style={styles.logoText}>
            Get everything you want in just one click.
          </Text>

          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleSignUp}
          >
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
  style={styles.adminSupportButton}
  onPress={async () => {
    // Stop auto-slide
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
    }
    // Mark onboarding as completed
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    // Navigate to account support (admin access)
    router.push("/auth/account-support");
  }}
>
  <Ionicons name="headset" size={18} color="#666" />
  <Text style={styles.adminSupportText}>Account Support</Text>
</TouchableOpacity>

          {/* Auto-navigate countdown indicator */}
          <View style={styles.autoNavigateContainer}>
            <Text style={styles.autoNavigateText}>
            </Text>
          </View>
        </View>
      </Swiper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topBackground: {
    position: "absolute",
    top: 0,
    width: 200,
    height: height * 0.46,
    backgroundColor: "#0A6BFF",
    borderBottomLeftRadius: 90,
    borderBottomRightRadius: 90,
    borderTopEndRadius: 90,
  },
  slide: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    width: width * 0.86,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 10,
    overflow: "hidden",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    marginTop: height * 0.00005,
  },
  image: {
    width: "100%",
    height: 250,
    borderRadius: 14,
    marginBottom: 18,
  },
  logoSlide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 30,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },
  logoText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },
  signupButton: {
    width: "80%",
    backgroundColor: "#0A6BFF",
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 14,
  },
  loginButton: {
    width: "80%",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#111", marginBottom: 8, textAlign: "center" },
  text: { fontSize: 15, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "#DDD", marginHorizontal: 4, bottom: 30 },
  activeDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "#0A6BFF", marginHorizontal: 4, bottom: 30 },
  autoNavigateContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  autoNavigateText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  adminSupportButton: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 10,
  marginTop: 50,
},
adminSupportText: {
  color: '#666',
  fontSize: 14,
  marginLeft: 6,
  textDecorationLine: 'none',
},
});