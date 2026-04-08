import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OverlayProvider } from "stream-chat-expo";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ChatProvider } from '../contexts/ChatContext';
import React from 'react';
import { ToastProvider } from '@/contexts/toast-content';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkOnboarding = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem('hasCompletedOnboarding');
      setHasCompletedOnboarding(!!onboardingCompleted);
    } catch (error) {
      console.log('Error checking onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkOnboarding();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  // Show onboarding if not completed
  if (!hasCompletedOnboarding) {
    return (
      <ThemeProvider value={theme}>
        <SafeAreaProvider style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding/OnboardingScreen" />
            <Stack.Screen name="login/LoginScreen" />
            <Stack.Screen name="signup/SignupScreen" />
          </Stack>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  // AFTER onboarding: Always start with login screen
  return (
    <ThemeProvider value={theme}>
      <ToastProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <ChatProvider>
        <OverlayProvider>
          <SafeAreaProvider style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login/LoginScreen" />
            <Stack.Screen name="signup/SignupScreen" />
            <Stack.Screen name="login/ForgotPasswordScreen" />
          
          <Stack.Screen name="home/Homescreen" />
          <Stack.Screen name="profile/ProfileScreen" />
          <Stack.Screen name="market/BuyScreen" />
          <Stack.Screen name="market/SellScreen" />
          <Stack.Screen name="market/ServiceDetailsScreen" />
          <Stack.Screen name="market/OrderScreen" />
          <Stack.Screen name="market/UploadProductScreen" />
          <Stack.Screen name="market/UploadServiceScreen" />
          <Stack.Screen name="market/UploadTypeScreen" />
          <Stack.Screen name="chat/ChatScreen" />
          <Stack.Screen name="transactions/TransactionHistoryScreen" />
          <Stack.Screen name="payment/CheckoutScreen" />
          <Stack.Screen name="payment/OrderSuccessScreen" />
          {/* <Stack.Screen name="delivery/AddressFormScreen" /> */}
          <Stack.Screen name="delivery/DeliveryAgentsScreen" />
          <Stack.Screen name="delivery/RegisterAgentScreen" />
          <Stack.Screen name="settings/SettingsScreen" />
          <Stack.Screen name="orders/OrderHistoryScreen" />
          <Stack.Screen name="messages/MessagesScreen" />
          <Stack.Screen name="notifications/NotificationsScreen" />
          <Stack.Screen name="wallet/DepositScreen" />
          <Stack.Screen name="wallet/Deposit-history" />
          <Stack.Screen name="wallet/WithdrawalScreen" />
          <Stack.Screen name="transfer/TransferScreen" />
          <Stack.Screen name="transfer/TransferHistoryScreen" />
          <Stack.Screen name="delivery/MyDeliveriesScreen" />
          <Stack.Screen name="delivery/AgreePriceScreen" />
          <Stack.Screen name="auth/account-support" />
          {/* Customer support */}
          <Stack.Screen name="support/SupportScreen"/>

          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </SafeAreaProvider>
      </OverlayProvider>
      </ChatProvider>
      </GestureHandlerRootView>
      </ToastProvider>
    </ThemeProvider>
  );
}
