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
  Linking,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";

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
  seller_phone?: string;
  category: string;
  attributes: Record<string, string>;
  category_info: {
    name: string;
    type: string;
    attributes: {
      key: string;
      label: string;
      type: string;
      options?: string[];
      required?: boolean;
    }[];
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
  const {showToast} = useToast();

  const orderDetails = {
    productId: params.productId as string,
    productName: params.productName as string,
    productPrice: params.productPrice as string,
    sellerId: params.sellerId as string,
    sellerName: params.sellerName as string,
    sellerPhone: params.sellerPhone as string,
    quantity: params.quantity as string,
    selectedOptions: params.selectedOptions as string,
    totalPrice: params.totalPrice as string,
    imageUri: params.imageUri as string,
  };

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
          console.log('Fetched product:', data);
          if (data.attributes) {
            setSelectedOptions(data.attributes);
          }
        } else {
          showToast("Failed to load product details",'error');
          router.back();
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        showToast("Failed to load product",'error');
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
    setSelectedOptions(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleWhatsApp = () => {
    const phoneNumber = product?.seller_phone || orderDetails.sellerPhone || '';
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanedNumber) { showToast("Seller's phone number not available",'error'); return; }
    Linking.openURL(`https://wa.me/${cleanedNumber}`).catch(() => showToast("Cannot open WhatsApp",'error'));
  };

  const handleCall = () => {
    const phoneNumber = product?.seller_phone || orderDetails.sellerPhone || '';
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanedNumber) { showToast("Seller's phone number not available",'error'); return; }
    Linking.openURL(`tel:${cleanedNumber}`).catch(() => showToast( "Cannot make call",'error'));
  };

  const handleBuyNow = () => {
    if (!product) return;
    const requiredFields = product.category_info?.attributes?.filter(field => field.required) || [];
    const missingFields = requiredFields.filter(field => !selectedOptions[field.key]);
    if (missingFields.length > 0) {
      showToast(`Please select: ${missingFields.map(field => field.label).join(', ')}`,'error');
      return;
    }
    let totalPrice = 0;
    const basePrice = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0;
    if (useNegotiatedPrice && negotiatedPrice) {
      const negotiatedAmount = parseFloat(negotiatedPrice.replace(/[^0-9.]/g, '')) || 0;
      totalPrice = negotiatedAmount * quantity;
    } else {
      totalPrice = basePrice * quantity;
    }
    if (totalPrice <= 0) { showToast("Please enter a valid price",'error'); return; }
    const mainImage = product.images?.[0] || product.image_url;
    router.push({
      pathname: "/payment/CheckoutScreen",
      params: {
        productId: product.id,
        productName: product.title,
        productPrice: useNegotiatedPrice ? negotiatedPrice : product.price,
        sellerId: product.seller_id,
        sellerName: product.seller_name,
        sellerPhone: product.seller_phone || orderDetails.sellerPhone,
        quantity: quantity,
        selectedOptions: JSON.stringify(selectedOptions),
        totalPrice: `₦${totalPrice.toLocaleString()}`,
        imageUri: mainImage,
      }
    });
  };

  const getPriceNumericValue = () => {
    const priceString = product?.price || "0";
    return parseFloat(priceString.replace(/[^\d.]/g, '')) || 0;
  };

  const calculateTotal = () => {
    if (!product) return 0;
    const basePrice = getPriceNumericValue();
    if (useNegotiatedPrice && negotiatedPrice) {
      const negotiatedAmount = parseFloat(negotiatedPrice.replace(/[^0-9.]/g, '')) || 0;
      return negotiatedAmount * quantity;
    }
    return basePrice * quantity;
  };

  const getSellerInitials = (name: string) => {
    return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'S';
  };

  // Add this helper function
const getFullImageUrl = (imagePath: string) => {

  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('file://')) return imagePath;
  // Assume relative path from your backend
  return imagePath;
};



  const renderField = (field: any) => {
    switch (field.type) {
      case 'select':
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}{field.required && <Text style={styles.requiredStar}> *</Text>}
            </Text>
            <View style={styles.optionsContainer}>
              {field.options?.map((option: string) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionChip, selectedOptions[field.key] === option && styles.optionChipActive]}
                  onPress={() => handleOptionChange(field.key, option)}
                >
                  <Text style={[styles.optionChipText, selectedOptions[field.key] === option && styles.optionChipTextActive]}>
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
              {field.label}{field.required && <Text style={styles.requiredStar}> *</Text>}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              placeholderTextColor="#9CA3AF"
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
        <ActivityIndicator size="large" color="#185FA5" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
          <Text style={styles.goBackText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  
  const categoryFields = product.category_info?.attributes || [];
  const mainImage = getFullImageUrl(product.images?.[0] || product.image_url || orderDetails.imageUri);
  const totalAmount = calculateTotal();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false, statusBarStyle: 'light' }} />

      <View style={styles.innerContainer}>

        {/* ── Hero image ── */}
        <View style={styles.heroContainer}>
          {mainImage ? (
            <Image source={{ uri: mainImage }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="cube-outline" size={72} color="rgba(255,255,255,0.25)" />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'transparent']}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.heroGradient}
          />

          {/* top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.glassBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Order details</Text>
            <TouchableOpacity style={styles.glassBtn}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* category badge */}
          {product.category_info?.name && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{product.category_info.name}</Text>
            </View>
          )}
        </View>

        {/* ── Bottom sheet ── */}
        <View style={styles.sheet}>
          <View style={styles.dragPill} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Price + rating */}
            <View style={styles.priceRow}>
              <Text style={styles.price}>₦{Number(product.price).toLocaleString()}</Text>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={12} color="#EF9F27" />
                <Text style={styles.ratingText}>4.8</Text>
              </View>
            </View>

            <Text style={styles.productTitle}>{product.title}</Text>

            {/* Seller row */}
            <View style={styles.sellerRow}>
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerAvatarText}>{getSellerInitials(product.seller_name)}</Text>
              </View>
              <Text style={styles.sellerText}>
                {product.seller_name}
                <Text style={styles.sellerDot}> · </Text>
                {product.seller_location}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Description */}
            <Text style={styles.sectionLabel}>About product</Text>
            <Text style={styles.description}>{product.description}</Text>

            {/* Category fields */}
            {categoryFields.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>Product options</Text>
                {categoryFields.map(renderField)}
              </>
            )}

            <View style={styles.divider} />

            {/* Quantity */}
            <Text style={styles.sectionLabel}>Quantity</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={18} color="#185FA5" />
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Ionicons name="add" size={18} color="#185FA5" />
              </TouchableOpacity>
              <Text style={styles.qtyUnit}>unit{quantity > 1 ? 's' : ''}</Text>
            </View>

            <View style={styles.divider} />

            {/* Negotiated price */}
            <View style={styles.negotiationBox}>
              <View style={styles.negHeader}>
                <View style={styles.negDot} />
                <Text style={styles.negTitle}>Negotiated price</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalText}>Optional</Text>
                </View>
              </View>
              <Text style={styles.negSubtitle}>
                If you agreed on a different price with the seller, enter it below.
              </Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Enter negotiated amount"
                  keyboardType="numeric"
                  value={negotiatedPrice}
                  onChangeText={(text) => {
                    setNegotiatedPrice(text);
                    if (text.trim() !== "") setUseNegotiatedPrice(true);
                  }}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.negFooter}>
                <Text style={styles.origPriceNote}>Listed price: {product.price}</Text>
                <TouchableOpacity onPress={() => { setNegotiatedPrice(""); setUseNegotiatedPrice(false); }}>
                  <Text style={styles.clearText}>Use original</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total amount</Text>
              <Text style={styles.totalAmount}>₦{totalAmount.toLocaleString()}</Text>
            </View>

            {/* CTA row */}
            <View style={styles.ctaRow}>
              <TouchableOpacity style={styles.iconBtn} onPress={handleWhatsApp}>
                <FontAwesome5 name="whatsapp" size={20} color="#25D366" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleCall}>
                <Ionicons name="call-outline" size={20} color="#185FA5" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.buyBtn} onPress={handleBuyNow}>
                <Text style={styles.buyBtnText}>Buy now</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

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
    backgroundColor: '#0f1923',
  },
  innerContainer: {
    flex: 1,
  },

  // Loading / Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  errorText: {
    fontSize: 17,
    color: '#1F2937',
    fontWeight: '500',
  },
  goBackBtn: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#185FA5',
  },
  goBackText: {
    color: '#185FA5',
    fontSize: 14,
    fontWeight: '500',
  },

  // Hero
  heroContainer: {
    height: 270,
    position: 'relative',
    backgroundColor: '#1a1a2e',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
  topBar: {
    position: 'absolute',
    top: statusBarHeight + 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  glassBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.1,
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    backgroundColor: 'rgba(24,95,165,0.8)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(181,212,244,0.35)',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B5D4F4',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Sheet
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -22,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 6,
  },
  dragPill: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Price + title
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#185FA5',
    letterSpacing: -0.5,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  productTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 26,
    marginBottom: 10,
  },

  // Seller
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sellerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#185FA5',
  },
  sellerText: {
    fontSize: 13,
    color: '#6B7280',
  },
  sellerDot: {
    color: '#D1D5DB',
  },

  // Divider
  divider: {
    height: 0.5,
    backgroundColor: '#F0F0F0',
    marginVertical: 18,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },

  // Fields
  fieldContainer: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  requiredStar: {
    color: '#E24B4A',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  optionChipActive: {
    backgroundColor: '#185FA5',
    borderColor: '#185FA5',
  },
  optionChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  optionChipTextActive: {
    color: '#fff',
  },
  textInput: {
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },

  // Quantity
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  qtyNum: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    minWidth: 28,
    textAlign: 'center',
  },
  qtyUnit: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 2,
  },

  // Negotiation box
  negotiationBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  negHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  negDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#185FA5',
  },
  negTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  optionalBadge: {
    marginLeft: 'auto',
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  optionalText: {
    fontSize: 11,
    color: '#185FA5',
    fontWeight: '500',
  },
  negSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#185FA5',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    paddingVertical: 12,
  },
  negFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  origPriceNote: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  clearText: {
    fontSize: 12,
    color: '#185FA5',
    fontWeight: '500',
  },

  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#185FA5',
    letterSpacing: -0.5,
  },

  // CTA row
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 50,
    height: 52,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyBtn: {
    flex: 1,
    height: 52,
    backgroundColor: '#185FA5',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  bottomPadding: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});