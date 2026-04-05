import React, { useState, useEffect } from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";

const isIOS = Platform.OS === 'ios';
const statusBarHeight = isIOS ? 20 : StatusBar.currentHeight || 0;

interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  image_url: string;
  images: string[];
  seller_id: string;
  seller_name: string;
  seller_location: string;
  category: string;
  attributes: Record<string, string>;
  category_info: {
    name: string;
    type: string;
    attributes: Array<{
      key: string;
      label: string;
      type: string;
      options?: string[];
      required?: boolean;
    }>;
  };
}

export default function OrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [negotiatedPrice, setNegotiatedPrice] = useState("");
  const [useNegotiatedPrice, setUseNegotiatedPrice] = useState(false);


const orderDetails = {
  productId: params.productId as string,
  productName: params.productName as string,
  productPrice: params.productPrice as string,
  sellerId: params.sellerId as string,
  sellerName: params.sellerName as string,
  quantity: params.quantity as string,
  selectedOptions: params.selectedOptions as string,
  totalPrice: params.totalPrice as string,
  imageUri: params.imageUri as string, // Make sure this is here
};
  // Fetch product details when screen loads
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productId = params.productId as string;
        const response = await fetch(`${BASE_URL}/api/products/${productId}`, {
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.id) {
          setProduct(data);
          
          // Pre-fill attributes that are already set (for existing products)
          if (data.attributes) {
            setSelectedOptions(data.attributes);
          }
        } else {
          Alert.alert("Error", "Failed to load product details");
          router.back();
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        Alert.alert("Error", "Failed to load product");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (params.productId) {
      fetchProduct();
    }
  }, [params.productId]);

  const handleOptionChange = (fieldKey: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleBuyNow = () => {
    if (!product) return;

    // Validate required fields
    const requiredFields = product.category_info?.attributes?.filter(field => field.required) || [];
    const missingFields = requiredFields.filter(field => !selectedOptions[field.key]);

    if (missingFields.length > 0) {
      Alert.alert(
        "Missing Information", 
        `Please select: ${missingFields.map(field => field.label).join(', ')}`
      );
      return;
    }

    // Calculate total price
    let totalPrice = 0;
    const basePrice = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0;
    
    if (useNegotiatedPrice && negotiatedPrice) {
      // Use negotiated price
      const negotiatedAmount = parseFloat(negotiatedPrice.replace(/[^0-9.]/g, '')) || 0;
      totalPrice = negotiatedAmount * quantity;
    } else {
      // Use original price
      totalPrice = basePrice * quantity;
    }

    if (totalPrice <= 0) {
      Alert.alert("Error", "Please enter a valid price");
      return;
    }

    // Get the main image URL
    const mainImage = product.images?.[0] || product.image_url;

    router.push({
      pathname: "/payment/CheckoutScreen",
      params: {
        productId: product.id,
        productName: product.title,
        productPrice: useNegotiatedPrice ? negotiatedPrice : product.price,
        sellerId: product.seller_id,
        sellerName: product.seller_name,
        quantity: quantity,
        selectedOptions: JSON.stringify(selectedOptions),
        totalPrice: `₦${totalPrice.toLocaleString()}`,
        imageUri: mainImage, // Add the image URL here
      }
    });
  };

  const handleMessageSeller = () => {
    if (!product) return;

    router.push({
      pathname: "/chat/ChatScreen",
      params: { 
        sellerId: product.seller_id, 
        sellerName: product.seller_name,
        productId: product.id,
        productName: product.title,
        productPrice: product.price
      }
    });
  };

  // Get the numeric value of product price
  const getPriceNumericValue = () => {
    const priceString = product?.price || "0";
    const numericValue = parseFloat(priceString.replace(/[^\d.]/g, '')) || 0;
    return numericValue;
  };

  // Calculate total based on current selections
  const calculateTotal = () => {
    if (!product) return 0;
    
    const basePrice = getPriceNumericValue();
    let total = 0;
    
    if (useNegotiatedPrice && negotiatedPrice) {
      const negotiatedAmount = parseFloat(negotiatedPrice.replace(/[^0-9.]/g, '')) || 0;
      total = negotiatedAmount * quantity;
    } else {
      total = basePrice * quantity;
    }
    
    return total;
  };

  const renderField = (field: any) => {
    switch (field.type) {
      case 'select':
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label} {field.required && '*'}
            </Text>
            <View style={styles.optionsContainer}>
              {field.options?.map((option: string) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    selectedOptions[field.key] === option && styles.selectedOption
                  ]}
                  onPress={() => handleOptionChange(field.key, option)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedOptions[field.key] === option && styles.selectedOptionText
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'text':
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label} {field.required && '*'}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              value={selectedOptions[field.key] || ''}
              onChangeText={(text) => handleOptionChange(field.key, text)}
            />
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const categoryFields = product.category_info?.attributes || [];
  const mainImage = product.images?.[0] || product.image_url;
  const totalAmount = calculateTotal();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ 
        headerShown: false,
        statusBarStyle: 'light',
        statusBarBackgroundColor: 'transparent',
        statusBarTranslucent: true,
      }} />
      
      <View style={styles.innerContainer}>
        {/* Product Image Header */}
        <View style={styles.imageContainer}>
          {orderDetails.imageUri ? (
  <Image 
    source={{ uri: orderDetails.imageUri }} 
    style={styles.productImage} 
    resizeMode="cover" 
  />
) : (
  <View style={styles.noImageContainer}>
    <Ionicons name="cube-outline" size={80} color="#ccc" />
    <Text style={styles.noImageText}>Product Image</Text>
  </View>
)}
          
          {/* Dark overlay for better text visibility */}
          <View style={styles.imageOverlay} />
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Details</Text>
            <View style={styles.placeholder} />
          </View>
        </View>

        {/* Order Details Section */}
        <View style={styles.orderModal}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            
            {/* Price and Title */}
            <View style={styles.priceSection}>
              <Text style={styles.price}>{product.price}</Text>
              <Text style={styles.productTitle}>{product.title}</Text>
              <Text style={styles.sellerInfo}>
                Sold by {product.seller_name} • {product.seller_location}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* About Product */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About product</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>

            {/* Category-specific Fields */}
            {categoryFields.length > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Product Options</Text>
                  {categoryFields.map(renderField)}
                </View>
              </>
            )}

            <View style={styles.divider} />

            {/* Quantity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Ionicons name="remove" size={20} color="#007AFF" />
                </TouchableOpacity>
                
                <Text style={styles.quantityText}>{quantity}</Text>
                
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => setQuantity(quantity + 1)}
                >
                  <Ionicons name="add" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Negotiated Price Section */}
            <View style={styles.section}>
              <View style={styles.negotiationSection}>
                <View style={styles.negotiationHeader}>
                  <Ionicons name="cash-outline" size={20} color="#007AFF" />
                  <Text style={styles.negotiationTitle}>Negotiated Price (Optional)</Text>
                </View>
                
                <Text style={styles.negotiationSubtitle}>
                  If you bargained with the seller, enter the agreed amount:
                </Text>
                
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>₦</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Enter negotiated amount"
                    keyboardType="numeric"
                    value={negotiatedPrice}
                    onChangeText={(text) => {
                      setNegotiatedPrice(text);
                      if (text.trim() !== "") {
                        setUseNegotiatedPrice(true);
                      }
                    }}
                  />
                </View>
                
                <Text style={styles.originalPriceNote}>
                  Original price: {product.price}
                </Text>
                
                <TouchableOpacity 
                  style={styles.clearPriceButton}
                  onPress={() => {
                    setNegotiatedPrice("");
                    setUseNegotiatedPrice(false);
                  }}
                >
                  <Text style={styles.clearPriceText}>Use original price</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Total Price */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalPrice}>
                ₦{totalAmount.toLocaleString()}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.buyNowButton}
                onPress={handleBuyNow}
              >
                <Text style={styles.buyNowText}>Buy now</Text>
              </TouchableOpacity>
            </View>

            {/* Message Seller Button */}
            <TouchableOpacity 
              style={styles.messageButton}
              onPress={handleMessageSeller}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
              <Text style={styles.messageButtonText}>Message Seller</Text>
            </TouchableOpacity>

            {/* Bottom padding for safe area */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
  },
  // Image section
  imageContainer: {
    height: 250,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: statusBarHeight + 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    padding: 0,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 28,
  },
  orderModal: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  priceSection: {
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  sellerInfo: {
    fontSize: 14,
    color: "#666",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 10,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  selectedOption: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  optionText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedOptionText: {
    color: "#fff",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    minWidth: 30,
    textAlign: "center",
  },
  // Negotiated Price Section Styles
  negotiationSection: {
    backgroundColor: '#f8f9ff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e9ff',
  },
  negotiationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  negotiationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  negotiationSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    paddingVertical: 12,
    minHeight: 40,
  },
  originalPriceNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  clearPriceButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearPriceText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 10,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  actionButtons: {
    marginTop: 20,
  },
  buyNowButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  buyNowText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    marginTop: 15,
    marginBottom: 10,
  },
  messageButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});