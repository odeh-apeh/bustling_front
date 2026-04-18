// app/onboarding/OnboardingScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, Animated } from "react-native";
import Swiper from "react-native-swiper";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

const { width, height } = Dimensions.get("window");

export default function OnboardingScreen() {
  const router = useRouter();
  const swiperRef = useRef<Swiper>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoSlideRef = useRef<any>(null);
  
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;


  const checkIfCompletedOnBoarding = async () => {
  try {
    const hasCompleted = await AsyncStorage.getItem("hasCompletedOnboarding");

    if (hasCompleted === "true") {
      router.replace("/login/LoginScreen");
    }
  } catch (error) {
    console.log("Error checking onboarding:", error);
  }
 };

    useEffect(() => {
      checkIfCompletedOnBoarding();
    }, []);

  useEffect(() => {
    startAutoSlide();
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
    
    return () => {
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentIndex === 2) {
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
      }
      return;
    }
    restartAutoSlide();
  }, [currentIndex]);

  

  const startAutoSlide = () => {
    autoSlideRef.current = setInterval(() => {
      handleAutoSlide();
    }, 3000);
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
      if (nextIndex < 3) {
        swiperRef.current.scrollBy(1);
      } else {
        if (autoSlideRef.current) {
          clearInterval(autoSlideRef.current);
        }
      }
    }
  };

  const handleIndexChanged = (index: number) => {
    setCurrentIndex(index);
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

  const handleSignUp = async () => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
    }
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    router.push("/signup/SignupScreen");
  };

  const handleLogin = async () => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
    }
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    router.push("/login/LoginScreen");
  };

  const handleAdminSupport = async () => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
    }
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    router.push("/auth/account-support");
  };



  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Animated decorative background */}
      <Animated.View style={[styles.topBackground, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#185FA5', '#0F4A7A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        />
      </Animated.View>

      <Swiper 
        ref={swiperRef}
        loop={false} 
        dotStyle={styles.dot} 
        activeDotStyle={styles.activeDot}
        onIndexChanged={handleIndexChanged}
        showsButtons={false}
      >
        {/* Slide 1 - Hello */}
        <View style={styles.slide}>
          <Animated.View 
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.imageContainer}>
              <Image
                source={require("../../assets/images/hello.png")}
                style={styles.image}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)']}
                style={styles.imageGradient}
              />
            </View>
            <View style={styles.iconCircle}>
              <Ionicons name="hand-left-outline" size={28} color="#185FA5" />
            </View>
            <Text style={styles.title}>Hello!</Text>
            <Text style={styles.text}>
              Welcome to Bustling — buy from home, sell from home.
            </Text>
            <View style={styles.progressIndicator}>
              <View style={[styles.progressDot, currentIndex === 0 && styles.progressDotActive]} />
              <View style={[styles.progressDot, currentIndex === 1 && styles.progressDotActive]} />
              <View style={[styles.progressDot, currentIndex === 2 && styles.progressDotActive]} />
            </View>
          </Animated.View>
        </View>

        {/* Slide 2 - Ready */}
        <View style={styles.slide}>
          <Animated.View 
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.imageContainer}>
              <Image
                source={require("../../assets/images/ready.png")}
                style={styles.image}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)']}
                style={styles.imageGradient}
              />
            </View>
            <View style={styles.iconCircle}>
              <Ionicons name="rocket-outline" size={28} color="#185FA5" />
            </View>
            <Text style={styles.title}>Ready?</Text>
            <Text style={styles.text}>
              Track errands, manage tasks and payments — everything in one place.
            </Text>
            <View style={styles.progressIndicator}>
              <View style={[styles.progressDot, currentIndex === 0 && styles.progressDotActive]} />
              <View style={[styles.progressDot, currentIndex === 1 && styles.progressDotActive]} />
              <View style={[styles.progressDot, currentIndex === 2 && styles.progressDotActive]} />
            </View>
          </Animated.View>
        </View>

        {/* Slide 3 - Logo + Buttons */}
        <View style={styles.logoSlide}>
          <Animated.View 
            style={[
              styles.logoContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.logoCircle}>
              {/* <LinearGradient
                colors={['#185FA5', '#0F4A7A']}
                style={styles.logoGradient}
              >
                <Ionicons name="cube-outline" size={60} color="#fff" />
              </LinearGradient> */}
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

            <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%', alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.signupButton}
                onPress={handleSignUp}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#185FA5', '#0F4A7A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Sign Up</Text>
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%', alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#fff', '#fff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButtonGradient}
                >
                  <Ionicons name="log-in-outline" size={18} color="#185FA5" />
                  <Text style={styles.loginButtonText}>Login</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.adminSupportButton}
              onPress={handleAdminSupport}
            >
              <Ionicons name="headset-outline" size={18} color="#9CA3AF" />
              <Text style={styles.adminSupportText}>Account Support</Text>
            </TouchableOpacity>

            <View style={styles.progressIndicator}>
              <View style={[styles.progressDot, currentIndex === 0 && styles.progressDotActive]} />
              <View style={[styles.progressDot, currentIndex === 1 && styles.progressDotActive]} />
              <View style={[styles.progressDot, currentIndex === 2 && styles.progressDotActive]} />
            </View>
          </Animated.View>
        </View>
      </Swiper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  topBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
    borderBottomLeftRadius: 90,
    borderBottomRightRadius: 90,
    overflow: 'hidden',
  },
  gradientBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  slide: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  card: {
    width: width * 0.86,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    marginTop: height * 0.05,
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
  },
  image: {
    width: "100%",
    height: 250,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -28,
    marginBottom: 16,
    shadowColor: '#185FA5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "#111827", 
    marginBottom: 8, 
    textAlign: "center" 
  },
  text: { 
    fontSize: 15, 
    color: "#6B7280", 
    textAlign: "center", 
    lineHeight: 22, 
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  progressIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  imageLogo:{
    width: "100%",
    height: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#185FA5',
    width: 20,
  },
  
  // Logo Slide
  logoSlide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 30,
  },
  logoContent: {
    alignItems: 'center',
    width: '100%',
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginBottom: 24,
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
  logoTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  logoText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  signupButton: {
    width: "80%",
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loginButton: {
    width: "80%",
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#185FA5',
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 16 
  },
  loginButtonText: {
    color: "#185FA5",
    fontWeight: "700",
    fontSize: 16,
  },
  adminSupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 20,
    gap: 6,
  },
  adminSupportText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  dot: { 
    width: 6, 
    height: 6, 
    borderRadius: 4, 
    backgroundColor: "#DDD", 
    marginHorizontal: 4, 
    bottom: 30 
  },
  activeDot: { 
    width: 20, 
    height: 6, 
    borderRadius: 4, 
    backgroundColor: "#185FA5", 
    marginHorizontal: 4, 
    bottom: 30 
  },
});