// app/auth/account-support.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from '@/helpers/core-service';
import { useToast } from '@/contexts/toast-content';

const { width } = Dimensions.get('window');

// First level security - change this!
const ACCESS_CODE = 'BUS2026';

// Your backend API URL
const API_URL = `${BASE_URL}`; // Change to your server IP

export default function AccountSupportScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'access' | 'login'>('access');
  const [accessCode, setAccessCode] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {showToast} = useToast();

  const handleAccessCodeSubmit = () => {
    if (!accessCode.trim()) {
      showToast('Please enter access code', 'error');
      return;
    }

    if (accessCode === ACCESS_CODE) {
      setStep('login');
      setAccessCode('');
    } else {
      showToast('Invalid Code', 'error');
    }
  };

  const handleAdminLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      showToast('Please enter phone and password', 'error');
      return;
    }

    setLoading(true);
    
    try {
      console.log('📤 Sending admin login request to:', `${API_URL}/api/admin/login`);

      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          password: password,
        }),
      });

      const data = await response.json();
      console.log('📦 Admin login response:', data);
      
      if (response.ok) {
        // Store admin session from backend response
        await AsyncStorage.setItem('adminUser', JSON.stringify(data.user));
        await AsyncStorage.setItem('adminToken', 'admin-authenticated');
        await AsyncStorage.setItem('admin_id', data.user.id.toString());
        
        showToast('Admin login successful', 'success');
        router.replace("/admin/dashboard");
      } else {
        showToast(data.message || 'Invalid admin credentials', 'error');
      }
      
    } catch (error: any) {
      console.error('💥 Admin login error:', error);
      showToast('Network error. Please check your connection.', 'error');
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  const handleBack = () => {
    if (step === 'login') {
      setStep('access');
      setPhone('');
      setPassword('');
    } else {
      router.back();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{ 
          title: 'Account Support',
          headerBackTitle: 'Back',
        }} 
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Icon */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              {step === 'access' ? (
                <Ionicons name="shield-checkmark" size={50} color="#0A6BFF" />
              ) : (
                <Ionicons name="hammer" size={50} color="#0A6BFF" />
              )}
            </View>
            
            {step === 'access' ? (
              <>
                <Text style={styles.title}>System Access</Text>
                <Text style={styles.subtitle}>
                  Enter system access code to continue
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Admin Portal</Text>
                <Text style={styles.subtitle}>
                  Enter admin credentials to access management system
                </Text>
              </>
            )}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {step === 'access' ? (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="key" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Access Code"
                    placeholderTextColor="#999"
                    value={accessCode}
                    onChangeText={setAccessCode}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="go"
                    onSubmitEditing={handleAccessCodeSubmit}
                    autoFocus={true}
                  />
                </View>
                
                <TouchableOpacity
                  style={[styles.button, (!accessCode || loading) && styles.buttonDisabled]}
                  onPress={handleAccessCodeSubmit}
                  disabled={!accessCode || loading}
                >
                  <Text style={styles.buttonText}>Verify Code</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Phone Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="phone-portrait" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Admin Phone Number"
                    placeholderTextColor="#999"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    editable={!loading}
                    autoFocus={true}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Admin Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    returnKeyType="go"
                    onSubmitEditing={handleAdminLogin}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={togglePasswordVisibility}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.button, (!phone || !password || loading) && styles.buttonDisabled]}
                  onPress={handleAdminLogin}
                  disabled={!phone || !password || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="construct" size={20} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>Access Admin Panel</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={18} color="#0A6BFF" />
              <Text style={styles.backButtonText}>
                {step === 'login' ? 'Back to Code Entry' : 'Back to Login'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer Note */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              <Ionicons name="person" size={14} color="#666" />
              {' '}System Administrator Access Only
            </Text>
            <Text style={styles.footerSubtext}>
              Unauthorized access is prohibited
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#0A6BFF20',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: width * 0.85,
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F8FA',
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputIcon: {
    marginLeft: 15,
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 14,
  },
  button: {
    width: '100%',
    backgroundColor: '#0A6BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
  backButtonText: {
    color: '#0A6BFF',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 6,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
    width: '100%',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
});