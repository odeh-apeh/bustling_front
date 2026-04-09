import React, { useState } from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";

const { height } = Dimensions.get("window");

// Check if device is iOS
const isIOS = Platform.OS === 'ios';

// Complete list of all Nigerian states
const ALL_NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", 
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", 
  "Federal Capital Territory", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", 
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", 
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", 
  "Taraba", "Yobe", "Zamfara"
];

export default function RegisterAgentScreen() {
  const router = useRouter();
  
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
  const {showToast} = useToast();

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
    // Validate form
    if (!formData.companyName || !formData.phoneNumber || !formData.state || 
        !formData.localGovernment) {
      showToast("Please fill in all required fields",'error');
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
        Alert.alert(
          "Application Submitted!",
          data.message || "Your delivery agent profile has been created and is under review.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/home/Homescreen")
            }
          ]
        );
      } else {
        showToast( data.message || "Something went wrong",'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showToast("Failed to connect to server. Please try again.",'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const vehicleTypes = ["Motorcycle", "Car", "Van", "Truck", "Bicycle"];

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
        <Ionicons name="checkmark" size={20} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
            <Text style={styles.backText}></Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Become Delivery Agent</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#4CAF50" />
            <Text style={styles.infoText}>
              Create your delivery profile to connect with buyers nationwide.
            </Text>
          </View>

          {/* Business Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Business Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company/Business Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.companyName}
                onChangeText={(value) => handleInputChange('companyName', value)}
                placeholder="Enter company or business name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Person Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={formData.fullName}
                onChangeText={(value) => handleInputChange('fullName', value)}
                placeholder="Full name of contact person"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                placeholder="Describe your delivery services"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.phoneNumber}
                onChangeText={(value) => handleInputChange('phoneNumber', value)}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Location Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Company Location</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>State *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowStateDropdown(true)}
              >
                <Text style={[
                  styles.dropdownButtonText,
                  !formData.state && styles.dropdownButtonPlaceholder
                ]}>
                  {formData.state || 'Select State'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              <Modal
                visible={showStateDropdown}
                animationType="slide"
                presentationStyle="pageSheet"
                transparent={true}
              >
                <SafeAreaView style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select State</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setShowStateDropdown(false);
                          setStateSearchQuery('');
                        }}
                      >
                        <Ionicons name="close" size={24} color="#000" />
                      </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={20} color="#999" />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search states..."
                        value={stateSearchQuery}
                        onChangeText={setStateSearchQuery}
                        placeholderTextColor="#999"
                        autoFocus
                      />
                    </View>

                    {/* States List */}
                    <FlatList
                      data={filteredStates}
                      renderItem={renderStateItem}
                      keyExtractor={(item) => item}
                      showsVerticalScrollIndicator={false}
                      style={styles.statesList}
                      keyboardShouldPersistTaps="handled"
                    />
                  </View>
                </SafeAreaView>
              </Modal>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Local Government Area (LGA) *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.localGovernment}
                onChangeText={(value) => handleInputChange('localGovernment', value)}
                placeholder="Enter your LGA"
              />
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
                  <Ionicons 
                    name={formData.deliveryTypes.includes('intrastate') ? "checkbox" : "square-outline"} 
                    size={20} 
                    color={formData.deliveryTypes.includes('intrastate') ? "#4CAF50" : "#666"} 
                  />
                  <Text style={styles.deliveryTypeText}>Within State (Intra-state)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deliveryTypeOption,
                    formData.deliveryTypes.includes('interstate') && styles.selectedDeliveryType
                  ]}
                  onPress={() => toggleDeliveryType('interstate')}
                >
                  <Ionicons 
                    name={formData.deliveryTypes.includes('interstate') ? "checkbox" : "square-outline"} 
                    size={20} 
                    color={formData.deliveryTypes.includes('interstate') ? "#4CAF50" : "#666"} 
                  />
                  <Text style={styles.deliveryTypeText}>Across States (Inter-state)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Terms */}
          <View style={styles.termsSection}>
            <Text style={styles.termsText}>
              Your profile will be visible to all buyers nationwide. Buyers will contact you directly to discuss delivery arrangements.
            </Text>
          </View>

          {/* Bottom padding for safe area */}
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
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Creating Profile..." : "Create Delivery Profile"}
              </Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: isIOS ? 10 : 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    marginLeft: 5,
    fontSize: 16,
    color: "#000",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: '#000',
  },
  placeholder: {
    width: 70,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 30,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e8",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: "#2e7d32",
    fontSize: 14,
    lineHeight: 18,
  },
  formSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
    color: "#000",
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  // Dropdown Styles
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownButtonPlaceholder: {
    color: '#999',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: isIOS ? 100 : 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    paddingVertical: 8,
    color: '#000',
  },
  statesList: {
    flex: 1,
  },
  stateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stateItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  stateItemText: {
    fontSize: 16,
    color: '#333',
  },
  stateItemTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vehicleOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    minWidth: 90,
  },
  selectedVehicle: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  vehicleOptionText: {
    color: "#666",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
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
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  selectedDeliveryType: {
    backgroundColor: "#f0f9f0",
    borderColor: "#4CAF50",
  },
  deliveryTypeText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  termsSection: {
    backgroundColor: "#fff3cd",
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  termsText: {
    color: "#856404",
    fontSize: 12,
    lineHeight: 16,
  },
  footerWrapper: {
    backgroundColor: "#fff",
  },
  footer: {
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});