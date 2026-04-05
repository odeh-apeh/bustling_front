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
  Dimensions,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";

const { width } = Dimensions.get("window");
const isIOS = Platform.OS === 'ios';

interface UserBalance {
  balance: number;
}

export default function ServiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    console.log('=== SERVICE DETAIL PARAMS ===');
    console.log('All params:', params);
    console.log('serviceId:', params.serviceId);
    console.log('Type of serviceId:', typeof params.serviceId);
  }, [params]);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); // 1: Select date/time, 2: Confirm booking
  const [serviceDuration, setServiceDuration] = useState("1 hour"); // Default duration
  const [agreedPrice, setAgreedPrice] = useState(""); // For negotiated price
  const [isProcessing, setIsProcessing] = useState(false);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [customPrice, setCustomPrice] = useState(""); // For fixed/hourly services where user can input custom price

  // Available time slots
  const timeSlots = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", 
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
  ];

  // Service details from params with safe defaults
  const serviceDetails = {
    id: params.serviceId as string || "",
    title: params.serviceName as string || "Service",
    seller: params.sellerName as string || "Seller",
    sellerId: params.sellerId as string || "",
    price: params.price as string || "0",
    pricingType: params.pricingType as string || "fixed", // 'fixed', 'hourly', or 'negotiable'
    serviceType: params.serviceType as string || "Service",
    experience: params.experience as string || "experienced",
    rating: params.rating as string || "0.0",
    location: params.location as string || "Location not specified",
    description: params.description as string || "No description available",
    // Get image from params if available
    image: params.imageUri ? { uri: params.imageUri as string } : undefined,
  };

  useEffect(() => {
    console.log('=== SERVICE DETAILS OBJECT ===');
    console.log('Service ID:', serviceDetails.id);
    console.log('Is ID empty?', serviceDetails.id === '');
    console.log('Full serviceDetails:', serviceDetails);
  }, [serviceDetails]);

  // Fetch user balance
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
      } else {
        Alert.alert("Error", "Failed to load wallet balance");
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      Alert.alert("Error", "Failed to load wallet balance");
    } finally {
      setLoading(false);
    }
  };

  // Extract numeric price safely
  const getPriceNumericValue = () => {
    const priceString = serviceDetails.price || "0";
    // Remove currency symbols and commas, keep only numbers
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
      // Use the agreed price if negotiated
      const negotiated = parseFloat(agreedPrice) || 0;
      return negotiated;
    } else if (customPrice) {
      // Use custom price if user entered one
      const custom = parseFloat(customPrice.replace(/[^\d.]/g, '')) || 0;
      return custom;
    } else {
      const basePrice = getPriceNumericValue();
      
      if (serviceDetails.pricingType === 'hourly') {
        // Only multiply if hourly and duration is selected
        const hoursMatch = serviceDuration.match(/\d+/);
        const hours = hoursMatch ? parseInt(hoursMatch[0]) : 1;
        return basePrice * hours;
      }
      
      // For fixed price, return as is
      return basePrice;
    }
  };

  // In the handleBookService function in ServiceDetailScreen
const handleBookService = async () => {
  if (!selectedTime) {
    Alert.alert("Error", "Please select a time slot");
    return;
  }

  // If pricing is negotiable, ensure price is entered
  if (serviceDetails.pricingType === 'negotiable' && (!agreedPrice || parseFloat(agreedPrice) <= 0)) {
    Alert.alert("Error", "Please enter the agreed price");
    return;
  }

  if (bookingStep === 1) {
    setBookingStep(2);
  } else {
    // Final booking confirmation with wallet check
    const totalPrice = calculateTotalPrice();
    
    // Check if user has sufficient balance
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
      // Determine the price to use
      const priceToUse = serviceDetails.pricingType === 'negotiable' 
        ? agreedPrice 
        : (customPrice || serviceDetails.price);
      
      // Remove currency symbols and parse
      const numericPrice = parseFloat(priceToUse.replace(/[^\d.]/g, '')) || 0;

      // Call the unified purchase endpoint
      const response = await fetch(`${BASE_URL}/api/wallet/book-service/${serviceDetails.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          quantity: 1, // Services are always quantity 1
          agreed_price: numericPrice, // Send the agreed price
          notes: `Service: ${serviceDetails.title}, Provider: ${serviceDetails.seller}`,
          scheduled_date: selectedDate.toISOString().split('T')[0],
          scheduled_time: selectedTime,
          duration: serviceDuration,
          service_type: serviceDetails.serviceType,
          location: serviceDetails.location,
          shipping_address: serviceDetails.location, // Using location as shipping address for services
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Navigate to success screen with booking details
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

  // Safe service type for display
  const getServiceTypeDisplay = () => {
    return serviceDetails.serviceType || "Service";
  };

  // Get pricing type display
  const getPricingTypeDisplay = () => {
    const pricingType = serviceDetails.pricingType || "fixed";
    if (pricingType === 'hourly') return '/hour';
    if (pricingType === 'negotiable') return 'Negotiable';
    return 'Fixed Price';
  };

  // Render price input based on pricing type
  const renderPriceSection = () => {
    const pricingType = serviceDetails.pricingType || "fixed";
    const totalPrice = calculateTotalPrice();
    const hasSufficientBalance = userBalance ? userBalance.balance >= totalPrice : false;
    
    // In the renderPriceSection function, update the agreed price input:
if (pricingType === 'negotiable') {
  return (
    <View style={styles.bookingField}>
      <Text style={styles.fieldLabel}>Agreed Price (₦)</Text>
      <View style={styles.priceInputContainer}>
        <Text style={styles.currencySymbol}>₦</Text>
        <TextInput
          style={styles.priceInput}
          placeholder="Enter agreed price"
          keyboardType="numeric"
          value={agreedPrice}
          onChangeText={(text) => {
            // Only allow numbers and decimal point
            const cleaned = text.replace(/[^0-9.]/g, '');
            setAgreedPrice(cleaned);
          }}
        />
      </View>
      <Text style={styles.inputHelper}>
        Discuss and agree on a price with the service provider first
      </Text>
      
      {/* Balance Check */}
      {userBalance && agreedPrice && (
        <View style={[
          styles.balanceCheck,
          hasSufficientBalance ? styles.sufficientBalance : styles.insufficientBalance
        ]}>
          <Ionicons 
            name={hasSufficientBalance ? "checkmark-circle" : "warning"} 
            size={16} 
            color={hasSufficientBalance ? "#4CAF50" : "#ff6b35"} 
          />
          <Text style={styles.balanceText}>
            Your balance: ₦{userBalance.balance.toLocaleString()} • 
            {hasSufficientBalance ? " Sufficient" : " Insufficient"}
          </Text>
        </View>
      )}
    </View>
  );
} else {
      // For fixed or hourly pricing, allow custom price input
      return (
        <View style={styles.bookingField}>
          <Text style={styles.fieldLabel}>Service Price (₦)</Text>
          <View style={styles.priceRow}>
            <View style={styles.sellerPriceContainer}>
              <Text style={styles.sellerPriceLabel}>Seller&apos;s Price:</Text>
              <Text style={styles.sellerPrice}>
                ₦{getPriceNumericValue().toLocaleString()} {getPricingTypeDisplay()}
              </Text>
            </View>
            <View style={styles.customPriceContainer}>
              <Text style={styles.customPriceLabel}>Your Offer:</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Enter your price"
                  keyboardType="numeric"
                  value={customPrice}
                  onChangeText={setCustomPrice}
                />
              </View>
            </View>
          </View>
          <Text style={styles.inputHelper}>
            {serviceDetails.pricingType === 'fixed' 
              ? "You can enter a different price to negotiate with the seller" 
              : "Hourly rate multiplied by duration"}
          </Text>
          
          {/* Balance Check */}
          {userBalance && (customPrice || serviceDetails.pricingType === 'hourly') && (
            <View style={[
              styles.balanceCheck,
              hasSufficientBalance ? styles.sufficientBalance : styles.insufficientBalance
            ]}>
              <Ionicons 
                name={hasSufficientBalance ? "checkmark-circle" : "warning"} 
                size={16} 
                color={hasSufficientBalance ? "#4CAF50" : "#ff6b35"} 
              />
              <Text style={styles.balanceText}>
                Your balance: ₦{userBalance.balance.toLocaleString()} • 
                {hasSufficientBalance ? " Sufficient" : " Insufficient"}
              </Text>
            </View>
          )}
        </View>
      );
    }
  };

  const totalPrice = calculateTotalPrice();
  const hasSufficientBalance = userBalance ? userBalance.balance >= totalPrice : false;

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
          <Text style={styles.headerTitle}>Service Details</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Service Image - Only show if available */}
          {serviceDetails.image ? (
            <Image 
              source={serviceDetails.image} 
              style={styles.serviceImage} 
              resizeMode="cover" 
            />
          ) : (
            <View style={styles.noImageContainer}>
              <Ionicons name="briefcase-outline" size={80} color="#ccc" />
              <Text style={styles.noImageText}>Service Image</Text>
            </View>
          )}

          {/* Service Info */}
          <View style={styles.section}>
            <Text style={styles.serviceTitle}>{serviceDetails.title}</Text>
            
            <View style={styles.sellerInfo}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{serviceDetails.rating}</Text>
              </View>
              <Text style={styles.sellerText}>By {serviceDetails.seller}</Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.detailText}>{serviceDetails.location}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.detailText}>{serviceDetails.experience}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="business-outline" size={16} color="#666" />
                <Text style={styles.detailText}>{getServiceTypeDisplay()}</Text>
              </View>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                {serviceDetails.pricingType === 'negotiable' 
                  ? 'Negotiable' 
                  : `₦${getPriceNumericValue().toLocaleString()}`
                }
              </Text>
              <Text style={styles.pricingType}>
                {getPricingTypeDisplay()}
              </Text>
            </View>
          </View>

          {/* Booking Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {bookingStep === 1 ? "Select Date & Time" : "Confirm Booking"}
            </Text>

            {bookingStep === 1 ? (
              <>
                {/* Price Input Section */}
                {renderPriceSection()}

                {/* Date Selection */}
                <View style={styles.bookingField}>
                  <Text style={styles.fieldLabel}>Select Date</Text>
                  <TouchableOpacity 
                    style={styles.dateTimeButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                    <Text style={styles.dateTimeText}>
                      {formatDate(selectedDate)}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Duration Selection (for hourly services only) */}
                {serviceDetails.pricingType === 'hourly' && (
                  <View style={styles.bookingField}>
                    <Text style={styles.fieldLabel}>Service Duration</Text>
                    <View style={styles.durationOptions}>
                      {['1 hour', '2 hours', '3 hours', '4 hours', 'Full day'].map((duration) => (
                        <TouchableOpacity
                          key={duration}
                          style={[
                            styles.durationOption,
                            serviceDuration === duration && styles.durationOptionSelected
                          ]}
                          onPress={() => setServiceDuration(duration)}
                        >
                          <Text style={[
                            styles.durationText,
                            serviceDuration === duration && styles.durationTextSelected
                          ]}>
                            {duration}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Time Selection */}
                <View style={styles.bookingField}>
                  <Text style={styles.fieldLabel}>Select Time Slot</Text>
                  <View style={styles.timeSlotsContainer}>
                    {timeSlots.map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeSlot,
                          selectedTime === time && styles.timeSlotSelected
                        ]}
                        onPress={() => handleTimeSelect(time)}
                      >
                        <Text style={[
                          styles.timeSlotText,
                          selectedTime === time && styles.timeSlotTextSelected
                        ]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            ) : (
              /* Confirmation Step */
              <View style={styles.confirmationSection}>
                <View style={styles.bookingSummary}>
                  <Text style={styles.summaryTitle}>Booking Summary</Text>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Date:</Text>
                    <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Time:</Text>
                    <Text style={styles.summaryValue}>{selectedTime}</Text>
                  </View>

                  {serviceDetails.pricingType === 'hourly' && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Duration:</Text>
                      <Text style={styles.summaryValue}>{serviceDuration}</Text>
                    </View>
                  )}

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Service:</Text>
                    <Text style={styles.summaryValue}>{serviceDetails.title}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Provider:</Text>
                    <Text style={styles.summaryValue}>{serviceDetails.seller}</Text>
                  </View>

                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalPrice}>₦{totalPrice.toLocaleString()}</Text>
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

                <View style={styles.paymentNote}>
                  <Ionicons name="lock-closed-outline" size={16} color="#34C759" />
                  <Text style={styles.paymentNoteText}>
                    Payment will be held securely in escrow and released to the service provider only after you confirm service completion.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Service Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Description</Text>
            <Text style={styles.descriptionText}>
              {serviceDetails.description}
            </Text>
          </View>

          {/* Safety Tips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safety Tips</Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#34C759" />
                <Text style={styles.tipText}>Payment is protected and released only after service completion</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="document-text-outline" size={16} color="#34C759" />
                <Text style={styles.tipText}>Keep communication within the app for your safety</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="star-outline" size={16} color="#34C759" />
                <Text style={styles.tipText}>Rate your experience after service completion</Text>
              </View>
            </View>
          </View>

          {/* Bottom padding for safe area */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Booking Footer */}
        <SafeAreaView edges={['bottom']} style={styles.bookingFooterWrapper}>
          <View style={styles.bookingFooter}>
            <View style={styles.priceFooter}>
              <Text style={styles.footerPrice}>₦{totalPrice.toLocaleString()}</Text>
              <Text style={styles.footerPricingType}>
                {serviceDetails.pricingType === 'hourly' ? `for ${serviceDuration}` : 'total'}
              </Text>
              {userBalance && (
                <Text style={[
                  styles.footerBalance,
                  !hasSufficientBalance && styles.insufficientFooterBalance
                ]}>
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
                  {bookingStep === 1 ? "Continue to Book" : "Confirm Booking"}
                </Text>
              )}
            </TouchableOpacity>

            {!hasSufficientBalance && (
              <TouchableOpacity 
                style={styles.topUpButton}
                onPress={() => router.push("/wallet/DepositScreen")}
              >
                <Text style={styles.topUpText}>Top Up</Text>
              </TouchableOpacity>
            )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginTop: isIOS ? 0 : 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  // Service Image or Placeholder
  serviceImage: {
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  serviceTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111",
  },
  sellerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E6B400",
    marginLeft: 4,
  },
  sellerText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
    fontWeight: "500",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: "#007AFF",
    marginRight: 6,
  },
  pricingType: {
    fontSize: 16,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#111",
  },
  bookingField: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
    color: "#333",
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9ff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderStyle: "dashed",
  },
  dateTimeText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
    marginLeft: 12,
  },
  // Price Input Styles
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sellerPriceContainer: {
    flex: 1,
    marginRight: 10,
  },
  sellerPriceLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  sellerPrice: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  customPriceContainer: {
    flex: 1,
    marginLeft: 10,
  },
  customPriceLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f8f9ff",
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007AFF",
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    paddingVertical: 10,
    minHeight: 40,
  },
  inputHelper: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    fontStyle: "italic",
  },
  // Balance Check
  balanceCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  sufficientBalance: {
    backgroundColor: '#e8f5e8',
  },
  insufficientBalance: {
    backgroundColor: '#ffe6e6',
    color: '#ff6b35',
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Duration Options
  durationOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
  },
  durationOptionSelected: {
    backgroundColor: "#007AFF",
  },
  durationText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  durationTextSelected: {
    color: "#fff",
  },
  timeSlotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  timeSlotSelected: {
    backgroundColor: "#007AFF",
  },
  timeSlotText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  timeSlotTextSelected: {
    color: "#fff",
  },
  confirmationSection: {
    gap: 20,
  },
  bookingSummary: {
    backgroundColor: "#f8f9ff",
    padding: 16,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#111",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    color: "#111",
    fontWeight: "600",
  },
  totalPrice: {
    fontSize: 18,
    color: "#007AFF",
    fontWeight: "700",
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#666",
  },
  balanceValue: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
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
  paymentNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 16,
    backgroundColor: "#f0f9f0",
    borderRadius: 8,
  },
  paymentNoteText: {
    fontSize: 12,
    color: "#2E7D32",
    flex: 1,
    lineHeight: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
    lineHeight: 16,
  },
  bookingFooterWrapper: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  bookingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  priceFooter: {
    flex: 1,
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#007AFF",
  },
  footerPricingType: {
    fontSize: 12,
    color: "#666",
  },
  footerBalance: {
    fontSize: 11,
    color: "#4CAF50",
    marginTop: 2,
  },
  insufficientFooterBalance: {
    color: "#ff6b35",
  },
  bookButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 16,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  processingButton: {
    opacity: 0.8,
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  topUpButton: {
    backgroundColor: "#ff6b35",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
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