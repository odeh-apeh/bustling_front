import React, { useState, useEffect } from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";

// Check if device is iOS
const isIOS = Platform.OS === 'ios';

interface OrderDetails {
  productId: string;
  productName: string;
  productPrice: string;
  buyerId?: string;
  sellerId: string;
  sellerName: string;
  quantity: string;
  selectedOptions: string;
  totalPrice: string;
  imageUri?: string;
}

interface UserBalance {
  balance: number;
}

interface CurrentUser {
  id: number;
  name: string;
  phone: string;
  email: string;
  type: string;
  location: string;
}

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Parse order details from params
  const orderDetails: OrderDetails = {
    productId: params.productId as string || '',
    productName: params.productName as string || '',
    productPrice: params.productPrice as string || '',
    buyerId: params.buyerId as string, // Optional - might not be passed
    sellerId: params.sellerId as string || '',
    sellerName: params.sellerName as string || '',
    quantity: params.quantity as string || '1',
    selectedOptions: params.selectedOptions as string || '{}',
    totalPrice: params.totalPrice as string || '',
    imageUri: params.imageUri as string,
  };

  // Fetch user balance and current user info
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch current user info
      const userResponse = await fetch(`${BASE_URL}/api/auth/me`, {
        credentials: 'include',
      });
      
      let userData;
      if (userResponse.ok) {
        const userResult = await userResponse.json();
        console.log('Current user response:', userResult);
        
        if (userResult.success && userResult.user) {
          setCurrentUser(userResult.user);
        } else {
          console.log('User not logged in or session expired');
        }
      } else {
        console.log('Failed to fetch current user:', userResponse.status);
      }

      // Fetch wallet balance
      const balanceResponse = await fetch(`${BASE_URL}/api/wallet/balance`, {
        credentials: 'include',
      });
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        console.log('Balance API response:', balanceData);
        
        if (balanceData.balance !== undefined) {
          setUserBalance({ balance: parseFloat(balanceData.balance) });
        } else if (balanceData.wallet_balance !== undefined) {
          setUserBalance({ balance: parseFloat(balanceData.wallet_balance) });
        } else {
          Alert.alert("Error", "Failed to load wallet balance");
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    console.log('=== Starting place order process ===');
    
    if (!userBalance) {
      Alert.alert("Error", "Unable to verify wallet balance");
      return;
    }

    // Get buyerId from current user (preferred) or from params
    let buyerId: number;
    
    if (currentUser) {
      // Use the current logged-in user's ID
      buyerId = currentUser.id;
      console.log('Using buyerId from current user:', buyerId);
    } else if (orderDetails.buyerId) {
      // Fallback: try to use buyerId from params
      buyerId = parseInt(orderDetails.buyerId);
      console.log('Using buyerId from params:', buyerId);
    } else {
      // No buyerId available
      Alert.alert(
        "Authentication Required",
        "Please log in to place an order",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => router.push("/login/LoginScreen") }
        ]
      );
      return;
    }

    // Validate buyerId
    if (isNaN(buyerId) || buyerId <= 0) {
      Alert.alert("Error", "Unable to identify user. Please log in again.");
      return;
    }

    // Parse other IDs
    const sellerId = parseInt(orderDetails.sellerId);
    const productId = parseInt(orderDetails.productId);
    const quantity = parseInt(orderDetails.quantity);

    console.log('buyerId:', buyerId, 'type:', typeof buyerId);
    console.log('sellerId:', sellerId, 'isNaN:', isNaN(sellerId));
    console.log('productId:', productId, 'isNaN:', isNaN(productId));
    console.log('quantity:', quantity, 'isNaN:', isNaN(quantity));

    // Extract numeric value from totalPrice
    const totalAmount = parseFloat(
      orderDetails.totalPrice
        .replace(/[^0-9.]/g, '')
        .replace(/,/g, '')
    );

    console.log('totalAmount:', totalAmount, 'isNaN:', isNaN(totalAmount));

    // Validate all required fields
    if (isNaN(sellerId) || isNaN(productId) || isNaN(quantity) || isNaN(totalAmount)) {
      console.error('Validation failed:');
      console.error('sellerId isNaN:', isNaN(sellerId));
      console.error('productId isNaN:', isNaN(productId));
      console.error('quantity isNaN:', isNaN(quantity));
      console.error('totalAmount isNaN:', isNaN(totalAmount));
      Alert.alert("Invalid Data", "Please check the order details and try again.");
      return;
    }

    // Check if user has sufficient balance
    console.log('User balance:', userBalance.balance, 'Total amount:', totalAmount);
    if (userBalance.balance < totalAmount) {
      Alert.alert(
        "Insufficient Balance", 
        `You need ₦${totalAmount.toLocaleString()} but your balance is ₦${userBalance.balance.toLocaleString()}`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Top Up", onPress: () => router.push("/wallet/DepositScreen") }
        ]
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Parse selected options
      let notes = '{}';
      try {
        const selectedOptions = orderDetails.selectedOptions ? 
          JSON.parse(orderDetails.selectedOptions) : {};
        notes = JSON.stringify(selectedOptions);
      } catch (error) {
        console.error('Error parsing selected options:', error);
        notes = '{}';
      }

      // Prepare request body
      const requestBody = {
        buyer_id: buyerId,
        seller_id: sellerId,
        product_id: productId,
        service_id: null,
        quantity: quantity,
        total: totalAmount,
        type: 'product',
        shipping_address: '', 
        payment_method: 'wallet',
        notes: notes,
      };



      // Create order in backend
      const response = await fetch(`${BASE_URL}/api/wallet/purchase/${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('Order API response status:', response.status);

      const responseText = await response.text();
      console.log('Order API response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        Alert.alert("Error", "Invalid response from server");
        return;
      }

      console.log('Order API parsed response:', data);

      if (response.ok && data.success) {
        // Navigate to success screen with order details
        router.replace({
          pathname: "/payment/OrderSuccessScreen",
          params: { 
            orderId: data.data.id,
            productName: orderDetails.productName,
            totalPrice: orderDetails.totalPrice,
            sellerName: orderDetails.sellerName,
            buyerName: currentUser?.name || 'Customer'
          }
        });
      } else {
        Alert.alert("Order Failed", data.message || data.error || "Failed to place order");
      }
    } catch (error) {
      console.error('Order error:', error);
      Alert.alert("Error", "Failed to place order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const parseSelectedOptions = () => {
    if (!orderDetails.selectedOptions) return null;
    try {
      return JSON.parse(orderDetails.selectedOptions);
    } catch (error) {
      return null;
    }
  };

  const selectedOptions = parseSelectedOptions();
  
  // Extract numeric value for balance comparison
  const totalAmount = orderDetails.totalPrice 
    ? parseFloat(orderDetails.totalPrice.replace(/[^0-9.]/g, '').replace(/,/g, ''))
    : 0;
    
  const hasSufficientBalance = userBalance ? userBalance.balance >= totalAmount : false;

  // Show user info if available
  const userInfo = currentUser ? `Logged in as: ${currentUser.name}` : 'Not logged in';

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ 
        headerShown: false,
        statusBarStyle: 'dark',
        statusBarBackgroundColor: '#fff',
      }} />
      
      <View style={styles.innerContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Order</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Info */}
          {currentUser && (
            <View style={styles.userInfoSection}>
              <Ionicons name="person-circle" size={20} color="#007AFF" />
              <Text style={styles.userInfoText}>{currentUser.name}</Text>
            </View>
          )}

          {/* Product Image */}
          {orderDetails.imageUri ? (
            <Image 
              source={{ uri: orderDetails.imageUri }} 
              style={styles.productImage} 
              resizeMode="cover" 
            />
          ) : (
            <View style={styles.noImageContainer}>
              <Ionicons name="cube-outline" size={80} color="#ccc" />
              {/* <Text style={styles.noImageText}>Product Image</Text> */}
            </View>
          )}

          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Product:</Text>
              <Text style={styles.summaryValue}>{orderDetails.productName}</Text>
            </View>
            
            {selectedOptions && Object.keys(selectedOptions).length > 0 && (
              <>
                {Object.entries(selectedOptions).map(([key, value]) => (
                  <View key={key} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}:
                    </Text>
                    <Text style={styles.summaryValue}>{value as string}</Text>
                  </View>
                ))}
              </>
            )}
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Quantity:</Text>
              <Text style={styles.summaryValue}>{orderDetails.quantity}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Seller:</Text>
              <Text style={styles.summaryValue}>{orderDetails.sellerName}</Text>
            </View>
          </View>

          {/* Payment Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Total Amount:</Text>
              <Text style={styles.amountValue}>{orderDetails.totalPrice}</Text>
            </View>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Your Balance:</Text>
              <Text style={[
                styles.balanceValue,
                !hasSufficientBalance && styles.insufficientBalance
              ]}>
                ₦{userBalance?.balance.toLocaleString() || '0'}
              </Text>
            </View>
            
            {!hasSufficientBalance && (
              <View style={styles.warningSection}>
                <Ionicons name="warning" size={16} color="#ff6b35" />
                <Text style={styles.warningText}>
                  Insufficient balance. Please top up your wallet.
                </Text>
              </View>
            )}
          </View>

          {/* Security Notice */}
          <View style={styles.securitySection}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={styles.securityText}>
              Your payment is secure. Funds are held in escrow until you confirm receipt.
            </Text>
          </View>

          {/* Terms */}
          <View style={styles.termsSection}>
            <Text style={styles.termsText}>
              By placing this order, you agree that the amount will be deducted from your wallet balance and held in escrow until you confirm receipt of the item. The seller will receive payment only after you confirm delivery.
            </Text>
          </View>

          {/* Bottom padding for safe area */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Place Order Button */}
        <SafeAreaView edges={['bottom']} style={styles.footerWrapper}>
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[
                styles.placeOrderButton, 
                (!hasSufficientBalance || isProcessing || !currentUser) && styles.disabledButton
              ]}
              onPress={handlePlaceOrder}
              disabled={!hasSufficientBalance || isProcessing || !currentUser}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.placeOrderText}>Processing...</Text>
                </>
              ) : !currentUser ? (
                <Text style={styles.placeOrderText}>Please Login to Order</Text>
              ) : (
                <Text style={styles.placeOrderText}>
                  Place Order - {orderDetails.totalPrice}
                </Text>
              )}
            </TouchableOpacity>

            {!currentUser && (
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={() => router.push("/login/LoginScreen")}
              >
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            )}

            {!hasSufficientBalance && currentUser && (
              <TouchableOpacity 
                style={styles.topUpButton}
                onPress={() => router.push("/wallet/DepositScreen")}
              >
                <Text style={styles.topUpText}>Top Up Wallet</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  innerContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    padding: 10,
    margin: 15,
    borderRadius: 8,
    gap: 8,
  },
  userInfoText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginTop: isIOS ? 0 : 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: '#000',
  },
  placeholder: {
    width: 26,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 15,
  },
  productImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#f0f0f0",
  },
  noImageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  noImageText: {
    marginTop: 10,
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
  },
  section: {
    backgroundColor: "#f8f9ff",
    padding: 15,
    borderRadius: 10,
    margin: 15,
    marginTop: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#000",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    color: "#666",
    fontSize: 14,
  },
  summaryValue: {
    color: "#000",
    fontSize: 14,
    fontWeight: "500",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  amountLabel: {
    color: "#666",
    fontSize: 16,
  },
  amountValue: {
    color: "#007AFF",
    fontSize: 20,
    fontWeight: "700",
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  balanceLabel: {
    color: "#666",
    fontSize: 14,
  },
  balanceValue: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "600",
  },
  insufficientBalance: {
    color: "#ff6b35",
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  warningText: {
    color: '#856404',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  securitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  securityText: {
    color: '#2e7d32',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  termsSection: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
    marginHorizontal: 15,
    marginBottom: 15,
  },
  termsText: {
    color: "#666",
    fontSize: 12,
    lineHeight: 16,
  },
  footerWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  placeOrderButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  placeOrderText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#28a745",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  topUpButton: {
    backgroundColor: "#ff6b35",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  topUpText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});