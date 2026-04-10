import React, { useState } from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";
import { StatusBar } from "expo-status-bar";

const { height, width } = Dimensions.get("window");
const isIOS = Platform.OS === 'ios';

const ALL_NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", 
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", 
  "Federal Capital Territory", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", 
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", 
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", 
  "Taraba", "Yobe", "Zamfara"
];

const vehicleTypes = ["Motorcycle", "Car", "Van", "Truck", "Bicycle"];

export default function RegisterAgentScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    companyName: "",
    fullName: "",
    description: "",
    phoneNumber: "",
    state: "",
    localGovernment: "",
    vehicleType: "",
    deliveryTypes: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleDeliveryType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      deliveryTypes: prev.deliveryTypes.includes(type)
        ? prev.deliveryTypes.filter(t => t !== type)
        : [...prev.deliveryTypes, type]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.companyName || !formData.phoneNumber || !formData.state || 
        !formData.localGovernment) {
      showToast("Please fill in all required fields", 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${BASE_URL}/api/delivery-company/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          companyName: formData.companyName,
          fullName: formData.fullName,
          description: formData.description,
          phoneNumber: formData.phoneNumber,
          state: formData.state,
          localGovernment: formData.localGovernment,
          vehicleType: formData.vehicleType,
          deliveryTypes: formData.deliveryTypes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message || "Your delivery agent profile has been created and is under review.");
        setShowSuccessModal(true);
      } else {
        showToast(data.message || "Something went wrong", 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showToast("Failed to connect to server. Please try again.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStates = ALL_NIGERIAN_STATES.filter(state =>
    state.toLowerCase().includes(stateSearchQuery.toLowerCase())
  );

  const renderStateItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.stateItem,
        formData.state === item && styles.stateItemSelected
      ]}
      onPress={() => {
        handleInputChange('state', item);
        setShowStateDropdown(false);
        setStateSearchQuery('');
      }}
    >
      <Text style={[
        styles.stateItemText,
        formData.state === item && styles.stateItemTextSelected
      ]}>
        {item}
      </Text>
      {formData.state === item && (
        <View style={styles.checkmarkCircle}>
          <Ionicons name="checkmark" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <>
    <StatusBar style="dark" backgroundColor={'#0066CC'}></StatusBar>
      <Stack.Screen options={{ headerShown: false }} />
      
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView 
          behavior={isIOS ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.innerContainer}>
            {/* Header */}
            <LinearGradient
              colors={['#0066CC', '#3986f9']}
              style={styles.headerGradient}
            >
              <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Become Delivery Agent</Text>
                <View style={styles.headerRight} />
              </View>
            </LinearGradient>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Info Banner */}
              <LinearGradient
                colors={['#D1FAE5', '#A7F3D0']}
                style={styles.infoBanner}
              >
                <Ionicons name="information-circle" size={24} color="#059669" />
                <Text style={styles.infoText}>
                  Create your delivery profile to connect with buyers nationwide.
                </Text>
              </LinearGradient>

              {/* Business Information */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Business Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Company/Business Name <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="business-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={formData.companyName}
                      onChangeText={(value) => handleInputChange('companyName', value)}
                      placeholder="Enter company or business name"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Contact Person Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={formData.fullName}
                      onChangeText={(value) => handleInputChange('fullName', value)}
                      placeholder="Full name of contact person"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Business Description</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="document-text-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={formData.description}
                      onChangeText={(value) => handleInputChange('description', value)}
                      placeholder="Describe your delivery services"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={formData.phoneNumber}
                      onChangeText={(value) => handleInputChange('phoneNumber', value)}
                      placeholder="Enter phone number"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>

              {/* Location Information */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Company Location</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>State <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowStateDropdown(true)}
                  >
                    <View style={styles.dropdownContent}>
                      <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                      <Text style={[
                        styles.dropdownButtonText,
                        !formData.state && styles.dropdownButtonPlaceholder
                      ]}>
                        {formData.state || 'Select State'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Local Government Area (LGA) <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="map-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={formData.localGovernment}
                      onChangeText={(value) => handleInputChange('localGovernment', value)}
                      placeholder="Enter your LGA"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {/* Vehicle & Delivery Types */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Vehicle & Service Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Vehicle Type (optional)</Text>
                  <View style={styles.vehicleGrid}>
                    {vehicleTypes.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.vehicleOption,
                          formData.vehicleType === type && styles.selectedVehicle
                        ]}
                        onPress={() => handleInputChange('vehicleType', type)}
                      >
                        <Text style={[
                          styles.vehicleOptionText,
                          formData.vehicleType === type && styles.selectedVehicleText
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Delivery Coverage (optional)</Text>
                  <View style={styles.deliveryTypes}>
                    <TouchableOpacity
                      style={[
                        styles.deliveryTypeOption,
                        formData.deliveryTypes.includes('intrastate') && styles.selectedDeliveryType
                      ]}
                      onPress={() => toggleDeliveryType('intrastate')}
                    >
                      <View style={styles.checkbox}>
                        {formData.deliveryTypes.includes('intrastate') && (
                          <Ionicons name="checkmark" size={14} color="#10B981" />
                        )}
                      </View>
                      <Text style={styles.deliveryTypeText}>Within State (Intra-state)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.deliveryTypeOption,
                        formData.deliveryTypes.includes('interstate') && styles.selectedDeliveryType
                      ]}
                      onPress={() => toggleDeliveryType('interstate')}
                    >
                      <View style={styles.checkbox}>
                        {formData.deliveryTypes.includes('interstate') && (
                          <Ionicons name="checkmark" size={14} color="#10B981" />
                        )}
                      </View>
                      <Text style={styles.deliveryTypeText}>Across States (Inter-state)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Terms */}
              <LinearGradient
                colors={['#FEF3C7', '#FDE68A']}
                style={styles.termsSection}
              >
                <Ionicons name="shield-checkmark" size={20} color="#D97706" />
                <Text style={styles.termsText}>
                  Your profile will be visible to all buyers nationwide. Buyers will contact you directly to discuss delivery arrangements.
                </Text>
              </LinearGradient>

              <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Submit Button */}
            <SafeAreaView edges={['bottom']} style={styles.footerWrapper}>
              <View style={styles.footer}>
                <TouchableOpacity 
                  style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <LinearGradient
                    colors={isSubmitting ? ['#9CA3AF', '#9CA3AF'] : ['#0066CC', '#3986f9']}
                    style={styles.submitButtonGradient}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="rocket-outline" size={20} color="#fff" />
                        <Text style={styles.submitButtonText}>Create Delivery Profile</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* State Selection Modal */}
      <Modal
        visible={showStateDropdown}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStateDropdown(false)}
      >
        <BlurView intensity={isIOS ? 40 : 70} tint="dark" style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowStateDropdown(false)}
          />
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#0066CC', '#3986f9']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowStateDropdown(false);
                  setStateSearchQuery('');
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search states..."
                value={stateSearchQuery}
                onChangeText={setStateSearchQuery}
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>

            <FlatList
              data={filteredStates}
              renderItem={renderStateItem}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              style={styles.statesList}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </BlurView>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <BlurView intensity={isIOS ? 40 : 70} tint="dark" style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {}}
          />
          <View style={styles.successModalContainer}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.successIconContainer}
            >
              <Ionicons name="checkmark" size={40} color="#fff" />
            </LinearGradient>
            
            <Text style={styles.successTitle}>Application Submitted!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace("/home/Homescreen");
              }}
            >
              <LinearGradient
                colors={['#0066CC', '#3986f9']}
                style={styles.successButtonGradient}
              >
                <Text style={styles.successButtonText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 8 : 40,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: "#065F46",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    color: "#1F2937",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    color: "#374151",
  },
  required: {
    color: "#EF4444",
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#1F2937',
  },
  dropdownButtonPlaceholder: {
    color: '#9CA3AF',
  },
  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vehicleOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  selectedVehicle: {
    backgroundColor: "#0066CC",
    borderColor: "#0066CC",
  },
  vehicleOptionText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
  },
  selectedVehicleText: {
    color: "#fff",
  },
  deliveryTypes: {
    gap: 10,
  },
  deliveryTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  selectedDeliveryType: {
    backgroundColor: "#F0FDF4",
    borderColor: "#10B981",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  deliveryTypeText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  termsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  termsText: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
    lineHeight: 16,
  },
  footerWrapper: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 20 : 10,
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    color: '#1F2937',
  },
  statesList: {
    flex: 1,
  },
  stateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  stateItemSelected: {
    backgroundColor: '#E6F2FF',
  },
  stateItemText: {
    fontSize: 15,
    color: '#374151',
  },
  stateItemTextSelected: {
    color: '#0066CC',
    fontWeight: '600',
  },
  checkmarkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -width * 0.4 }, { translateY: -140 }],
    width: width * 0.8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  successButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  successButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});