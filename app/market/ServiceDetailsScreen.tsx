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
  Platform,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";

const isIOS = Platform.OS === 'ios';
const statusBarHeight = isIOS ? 20 : StatusBar.currentHeight || 0;

interface UserBalance {
  balance: number;
}

export default function ServiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [serviceDuration, setServiceDuration] = useState("1 hour");
  const [agreedPrice, setAgreedPrice] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [customPrice, setCustomPrice] = useState("");

  const timeSlots = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", 
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
  ];

  const serviceDetails = {
    id: params.serviceId as string || "",
    title: params.serviceName as string || "Service",
    seller: params.sellerName as string || "Seller",
    sellerId: params.sellerId as string || "",
    price: params.price as string || "0",
    pricingType: params.pricingType as string || "fixed",
    serviceType: params.serviceType as string || "Service",
    experience: params.experience as string || "experienced",
    rating: params.rating as string || "0.0",
    location: params.location as string || "Location not specified",
    description: params.description as string || "No description available",
    image: params.imageUri ? { uri: params.imageUri as string } : undefined,
  };

  useEffect(() => {
    fetchUserBalance();
  }, []);

  const fetchUserBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/wallet/balance`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.balance !== undefined) {
        setUserBalance({ balance: data.balance });
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriceNumericValue = () => {
    const priceString = serviceDetails.price || "0";
    const numericValue = parseFloat(priceString.replace(/[^\d.]/g, '')) || 0;
    return numericValue;
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const calculateTotalPrice = () => {
    if (serviceDetails.pricingType === 'negotiable') {
      const negotiated = parseFloat(agreedPrice) || 0;
      return negotiated;
    } else if (customPrice) {
      const custom = parseFloat(customPrice.replace(/[^\d.]/g, '')) || 0;
      return custom;
    } else {
      const basePrice = getPriceNumericValue();
      if (serviceDetails.pricingType === 'hourly') {
        const hoursMatch = serviceDuration.match(/\d+/);
        const hours = hoursMatch ? parseInt(hoursMatch[0]) : 1;
        return basePrice * hours;
      }
      return basePrice;
    }
  };

  const handleBookService = async () => {
    if (!selectedTime) {
      Alert.alert("Error", "Please select a time slot");
      return;
    }

    if (serviceDetails.pricingType === 'negotiable' && (!agreedPrice || parseFloat(agreedPrice) <= 0)) {
      Alert.alert("Error", "Please enter the agreed price");
      return;
    }

    if (bookingStep === 1) {
      setBookingStep(2);
    } else {
      const totalPrice = calculateTotalPrice();
      
      if (!userBalance || userBalance.balance < totalPrice) {
        Alert.alert(
          "Insufficient Balance", 
          `You need ₦${totalPrice.toLocaleString()} but your balance is ₦${userBalance?.balance.toLocaleString() || '0'}`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Top Up", onPress: () => router.push("/wallet/DepositScreen") }
          ]
        );
        return;
      }

      setIsProcessing(true);

      try {
        const priceToUse = serviceDetails.pricingType === 'negotiable' 
          ? agreedPrice 
          : (customPrice || serviceDetails.price);
        
        const numericPrice = parseFloat(priceToUse.replace(/[^\d.]/g, '')) || 0;

        const response = await fetch(`${BASE_URL}/api/wallet/book-service/${serviceDetails.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            quantity: 1,
            agreed_price: numericPrice,
            notes: `Service: ${serviceDetails.title}, Provider: ${serviceDetails.seller}`,
            scheduled_date: selectedDate.toISOString().split('T')[0],
            scheduled_time: selectedTime,
            duration: serviceDuration,
            service_type: serviceDetails.serviceType,
            location: serviceDetails.location,
            shipping_address: serviceDetails.location,
          }),
        });

        const data = await response.json();

        if (data.success) {
          router.push({
            pathname: "/payment/OrderSuccessScreen",
            params: {
              successType: "service",
              orderId: data.data?.id || `SVC-${Date.now()}`,
              itemTitle: serviceDetails.title,
              itemPrice: `₦${totalPrice.toLocaleString()}`,
              sellerId: serviceDetails.sellerId,
              sellerName: serviceDetails.seller,
              scheduledDate: selectedDate.toISOString().split('T')[0],
              scheduledTime: selectedTime,
              serviceDuration: serviceDuration,
              orderType: 'service'
            }
          });
        } else {
          Alert.alert("Booking Failed", data.message || "Failed to book service");
        }
      } catch (error) {
        console.error('Booking error:', error);
        Alert.alert("Error", "Failed to book service. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSellerInitials = (name: string) => {
    return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'S';
  };

  const getServiceTypeDisplay = () => {
    return serviceDetails.serviceType || "Service";
  };

  const getPricingTypeDisplay = () => {
    const pricingType = serviceDetails.pricingType || "fixed";
    if (pricingType === 'hourly') return '/hour';
    if (pricingType === 'negotiable') return 'Negotiable';
    return 'Fixed';
  };

  const totalPrice = calculateTotalPrice();
  const hasSufficientBalance = userBalance ? userBalance.balance >= totalPrice : false;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#185FA5" />
        <Text style={styles.loadingText}>Loading service...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false, statusBarStyle: 'light' }} />

      <View style={styles.innerContainer}>
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          {serviceDetails.image ? (
            <Image source={serviceDetails.image} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="briefcase-outline" size={72} color="rgba(255,255,255,0.25)" />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'transparent']}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.heroGradient}
          />

          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.glassBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Service Details</Text>
            <TouchableOpacity style={styles.glassBtn}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{getServiceTypeDisplay()}</Text>
          </View>
        </View>

        {/* Bottom Sheet */}
        <View style={styles.sheet}>
          <View style={styles.dragPill} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Price + Rating */}
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                ₦{getPriceNumericValue().toLocaleString()}
                {serviceDetails.pricingType === 'hourly' && <Text style={styles.perHour}>/hr</Text>}
              </Text>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={12} color="#EF9F27" />
                <Text style={styles.ratingText}>{serviceDetails.rating}</Text>
              </View>
            </View>

            <Text style={styles.productTitle}>{serviceDetails.title}</Text>

            {/* Seller Row */}
            <View style={styles.sellerRow}>
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerAvatarText}>{getSellerInitials(serviceDetails.seller)}</Text>
              </View>
              <Text style={styles.sellerText}>
                {serviceDetails.seller}
                <Text style={styles.sellerDot}> · </Text>
                {serviceDetails.location}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Service Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailChip}>
                <Ionicons name="time-outline" size={14} color="#185FA5" />
                <Text style={styles.detailChipText}>{serviceDetails.experience}</Text>
              </View>
              <View style={styles.detailChip}>
                <Ionicons name="pricetag-outline" size={14} color="#185FA5" />
                <Text style={styles.detailChipText}>{getPricingTypeDisplay()}</Text>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.sectionLabel}>About this service</Text>
            <Text style={styles.description}>{serviceDetails.description}</Text>

            <View style={styles.divider} />

            {/* Booking Section */}
            {bookingStep === 1 ? (
              <>
                {/* Price Input Section */}
                {serviceDetails.pricingType === 'negotiable' && (
                  <>
                    <Text style={styles.sectionLabel}>Agreed Price</Text>
                    <View style={styles.priceInputContainer}>
                      <Text style={styles.currencySymbol}>₦</Text>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="Enter agreed price"
                        keyboardType="numeric"
                        value={agreedPrice}
                        onChangeText={(text) => setAgreedPrice(text.replace(/[^0-9.]/g, ''))}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <Text style={styles.inputHelper}>
                      Discuss and agree on a price with the service provider first
                    </Text>
                  </>
                )}

                {(serviceDetails.pricingType === 'fixed' || serviceDetails.pricingType === 'hourly') && (
                  <>
                    <Text style={styles.sectionLabel}>Your Offer (Optional)</Text>
                    <View style={styles.priceInputContainer}>
                      <Text style={styles.currencySymbol}>₦</Text>
                      <TextInput
                        style={styles.priceInput}
                        placeholder={`Seller's price: ${getPriceNumericValue().toLocaleString()}`}
                        keyboardType="numeric"
                        value={customPrice}
                        onChangeText={setCustomPrice}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <Text style={styles.inputHelper}>
                      Enter a different price to negotiate with the seller
                    </Text>
                  </>
                )}

                {/* Date Selection */}
                <Text style={styles.sectionLabel}>Select Date</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#185FA5" />
                  <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Duration Selection (for hourly services) */}
                {serviceDetails.pricingType === 'hourly' && (
                  <>
                    <Text style={styles.sectionLabel}>Duration</Text>
                    <View style={styles.optionsContainer}>
                      {['1 hour', '2 hours', '3 hours', '4 hours', 'Full day'].map((duration) => (
                        <TouchableOpacity
                          key={duration}
                          style={[styles.optionChip, serviceDuration === duration && styles.optionChipActive]}
                          onPress={() => setServiceDuration(duration)}
                        >
                          <Text style={[styles.optionChipText, serviceDuration === duration && styles.optionChipTextActive]}>
                            {duration}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Time Selection */}
                <Text style={styles.sectionLabel}>Select Time Slot</Text>
                <View style={styles.optionsContainer}>
                  {timeSlots.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[styles.optionChip, selectedTime === time && styles.optionChipActive]}
                      onPress={() => handleTimeSelect(time)}
                    >
                      <Text style={[styles.optionChipText, selectedTime === time && styles.optionChipTextActive]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              /* Confirmation Step */
              <>
                <Text style={styles.sectionLabel}>Booking Summary</Text>
                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Date</Text>
                    <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Time</Text>
                    <Text style={styles.summaryValue}>{selectedTime}</Text>
                  </View>
                  {serviceDetails.pricingType === 'hourly' && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Duration</Text>
                      <Text style={styles.summaryValue}>{serviceDuration}</Text>
                    </View>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Service</Text>
                    <Text style={styles.summaryValue}>{serviceDetails.title}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Provider</Text>
                    <Text style={styles.summaryValue}>{serviceDetails.seller}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalSummaryRow]}>
                    <Text style={styles.totalSummaryLabel}>Total Amount</Text>
                    <Text style={styles.totalSummaryValue}>₦{totalPrice.toLocaleString()}</Text>
                  </View>
                </View>

                <View style={styles.paymentNoteBox}>
                  <Ionicons name="shield-checkmark" size={18} color="#34C759" />
                  <Text style={styles.paymentNoteText}>
                    Payment held securely in escrow until you confirm service completion
                  </Text>
                </View>
              </>
            )}

            {/* Safety Tips */}
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Safety Tips</Text>
            <View style={styles.tipsContainer}>
              <View style={styles.tipRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#34C759" />
                <Text style={styles.tipText}>Payment protected - released only after service completion</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="chatbubbles-outline" size={16} color="#34C759" />
                <Text style={styles.tipText}>Keep communication within the app for your safety</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="star-outline" size={16} color="#34C759" />
                <Text style={styles.tipText}>Rate your experience after service completion</Text>
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>

        {/* Footer */}
        <SafeAreaView edges={['bottom']} style={styles.footerWrapper}>
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerPrice}>₦{totalPrice.toLocaleString()}</Text>
              <Text style={styles.footerTotal}>Total</Text>
              {userBalance && (
                <Text style={[styles.footerBalance, !hasSufficientBalance && styles.insufficientFooterBalance]}>
                  Balance: ₦{userBalance.balance.toLocaleString()}
                </Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={[
                styles.bookButton,
                (!selectedTime || (serviceDetails.pricingType === 'negotiable' && !agreedPrice) || !hasSufficientBalance) && styles.disabledButton,
                isProcessing && styles.processingButton
              ]}
              onPress={handleBookService}
              disabled={!selectedTime || (serviceDetails.pricingType === 'negotiable' && !agreedPrice) || !hasSufficientBalance || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.bookButtonText}>
                  {bookingStep === 1 ? "Continue" : "Confirm Booking"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
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
  
  // Hero Section
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

  // Bottom Sheet
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

  // Price Row
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
  perHour: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
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

  // Seller Row
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

  // Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Details Grid
  detailsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F1FB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  detailChipText: {
    fontSize: 12,
    color: '#185FA5',
    fontWeight: '500',
  },

  // Description
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },

  // Price Input
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 18,
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
  inputHelper: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 18,
  },

  // Date Button
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    marginLeft: 12,
  },

  // Options
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
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

  // Summary Box
  summaryBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  totalSummaryRow: {
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 4,
  },
  totalSummaryLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  totalSummaryValue: {
    fontSize: 18,
    color: '#185FA5',
    fontWeight: '700',
  },

  // Payment Note
  paymentNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  paymentNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },

  // Tips Container
  tipsContainer: {
    gap: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },

  // Footer
  footerWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  footerLeft: {
    flex: 1,
  },
  footerPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#185FA5',
  },
  footerTotal: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  footerBalance: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 2,
  },
  insufficientFooterBalance: {
    color: '#E24B4A',
  },
  bookButton: {
    backgroundColor: '#185FA5',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  processingButton: {
    opacity: 0.8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  bottomPadding: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});