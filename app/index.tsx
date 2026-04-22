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


/**
 * Fix top up issue at admin dashboard {Approving and Rejecting deposits}
 * Fix Withdrawal issue at admin dashboard {Approving and Rejecting withdrawals}
 * Add a new Screen for transaction pin => used for security purposes when a user wants to make a withdrawal, they will be required to enter their transaction pin
 * Notifications history screen => shows all the notifications a user has received in the app
 * Cloudinary integration for image uploads => to handle user profile pictures and item images in the marketplace
 *  - Add image upload functionality to the profile settings screen for users to update their profile picture
 *  - Add image upload functionality to the sell item screen for users to upload pictures of the items they want to sell
 * Fix the issue with Money being lost after purchace being lost in the marketplace
 *  - services does not exists in request delivery 
 *  Add a new screen for dashboard for Delivery Agents
 *  Add a modal for viewing delivery details for delivery agents
 */