// app/admin/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

export default function AdminLayout() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const checkAdminAuth = async () => {
      const adminUser = await AsyncStorage.getItem('adminUser');
      const adminToken = await AsyncStorage.getItem('adminToken');
      
      // If in admin section but not authenticated
      if (segments[0] === 'admin' && (!adminUser || !adminToken)) {
        console.log('⚠️ No admin session, redirecting to login');
        router.replace('/auth/account-support');
      }
    };

    checkAdminAuth();
  }, [segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#3986f9',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      {/* Define ALL admin screens here */}
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          title: 'Admin Dashboard',
        }} 
      />
      <Stack.Screen 
        name="disputes" 
        options={{ 
          title: 'Disputes',
        }} 
      />
      <Stack.Screen 
        name="escrows" 
        options={{ 
          title: 'Escrow',
        }} 
      />
      <Stack.Screen 
        name="orders" 
        options={{ 
          title: 'Orders',
        }} 
      />
      <Stack.Screen 
        name="products" 
        options={{ 
          title: 'Products',
        }} 
      />
      <Stack.Screen 
        name="transactions" 
        options={{ 
          title: 'Transactions',
        }} 
      />
      <Stack.Screen 
        name="users" 
        options={{ 
          title: 'Users',
        }} 
      />
      <Stack.Screen
        name='pending-deposits'
        options={{
          title: 'Pending-Deposits'
        }}
      />
      <Stack.Screen
        name='pending-withdrawals'
        options={{
          title: 'Pending-Withdrawals'
        }}
      />
    </Stack>
  );
}