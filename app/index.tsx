import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import React from 'react';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to onboarding immediately
    router.replace('/onboarding/OnboardingScreen');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}