import React, { useState, useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";

const { width } = Dimensions.get("window");

// Check if device is iOS
const isIOS = Platform.OS === 'ios';

interface Category {
  id: number;
  name: string;
  type: string;
  attributes: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
    required?: boolean;
    placeholder?: string;
  }>;
}

export default function UploadServiceScreen() {
  const router = useRouter();
  
  // Form state
  const [serviceData, setServiceData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    category_id: "",
    pricingType: "fixed",
    attributes: {} as Record<string, string>,
  });
  
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Request permissions and fetch categories
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setHasPermission(status === 'granted');
      }

      // Fetch service categories from backend
      await fetchServiceCategories();
    })();
  }, []);

  // Fetch service categories with attributes from backend
  const fetchServiceCategories = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/products/categories/with-attributes?type=service`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
      } else {
        Alert.alert("Error", "Failed to load service categories");
      }
    } catch (error) {
      console.error('Error fetching service categories:', error);
      Alert.alert("Error", "Failed to load service categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  // Get fields for selected category
  const getCategoryFields = () => {
    if (!serviceData.category_id) return [];
    const category = categories.find(cat => cat.id.toString() === serviceData.category_id);
    return category ? category.attributes : [];
  };

  const pickImage = async () => {
    if (images.length >= 4) {
      Alert.alert("Limit Reached", "You can only upload up to 4 images");
      return;
    }

    if (hasPermission === false) {
      Alert.alert("Permission Required", "Please enable photo library access in settings");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleAttributeChange = (key: string, value: string) => {
    setServiceData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [key]: prev.attributes[key] === value ? '' : value // Toggle selection
      }
    }));
  };

  const handleCategorySelect = (category: Category) => {
    // Allow category deselection by clicking the same category again
    const newCategoryId = serviceData.category_id === category.id.toString() ? '' : category.id.toString();
    const newCategory = serviceData.category_id === category.id.toString() ? '' : category.name;
    
    setServiceData(prev => ({
      ...prev,
      category: newCategory,
      category_id: newCategoryId,
      attributes: {} // Reset attributes when category changes
    }));
  };

  const handleSubmit = async () => {
    if (!serviceData.title || !serviceData.description || !serviceData.price || !serviceData.category) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (images.length === 0) {
      Alert.alert("Error", "Please add at least one service image or portfolio sample");
      return;
    }

    // Validate required attributes
    const categoryFields = getCategoryFields();
    const requiredFields = categoryFields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !serviceData.attributes[field.key]);

    if (missingFields.length > 0) {
      Alert.alert(
        "Missing Information", 
        `Please fill in: ${missingFields.map(field => field.label).join(', ')}`
      );
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      
      // Basic service data - matching your product structure
      formData.append('title', serviceData.title);
      formData.append('description', serviceData.description);
      formData.append('price', serviceData.price);
      formData.append('category', serviceData.category);
      formData.append('type', 'service'); // Important: Set type as service
      
      // Add attributes if any
      if (Object.keys(serviceData.attributes).length > 0) {
        formData.append('attributes', JSON.stringify({
          ...serviceData.attributes,
          pricing_type: serviceData.pricingType // Include pricing type in attributes
        }));
      }

      // Append images
      images.forEach((uri, index) => {
        formData.append('images', {
          uri,
          type: 'image/jpeg',
          name: `service_${Date.now()}_${index}.jpg`
        } as any);
      });

      console.log('📤 Uploading service...');
      
      // Upload to your backend - using the same products endpoint but with type=service
      const response = await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      console.log('📦 Service upload response:', data);
      
      if (data.success || data.message) {
        Alert.alert("Success", "Service created successfully!");
        router.back();
      } else {
        Alert.alert("Error", data.message || "Failed to create service");
      }
    } catch (error) {
      console.error('💥 Service upload error:', error);
      Alert.alert("Error", "Failed to create service. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const categoryFields = getCategoryFields();

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
          <Text style={styles.headerTitle}>Create Service</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Portfolio Images Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio Images (Max 4)</Text>
            <Text style={styles.sectionSubtitle}>Showcase your previous work, certificates, or service examples</Text>
            
            <View style={styles.imagesContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {images.length < 4 && (
                <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={30} color="#007AFF" />
                  <Text style={styles.addImageText}>Add Image</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Professional Home Cleaning Service"
                value={serviceData.title}
                onChangeText={(text) => setServiceData(prev => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe what your service includes, your expertise, and what clients can expect..."
                multiline
                numberOfLines={5}
                value={serviceData.description}
                onChangeText={(text) => setServiceData(prev => ({ ...prev, description: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pricing *</Text>
              <View style={styles.pricingRow}>
                <View style={styles.pricingTypeContainer}>
                  <Text style={styles.pricingLabel}>Type</Text>
                  <View style={styles.pricingOptions}>
                    <TouchableOpacity
                      style={[
                        styles.pricingOption,
                        serviceData.pricingType === 'fixed' && styles.pricingOptionSelected
                      ]}
                      onPress={() => setServiceData(prev => ({ ...prev, pricingType: 'fixed' }))}
                    >
                      <Text style={[
                        styles.pricingOptionText,
                        serviceData.pricingType === 'fixed' && styles.pricingOptionTextSelected
                      ]}>
                        Fixed
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.pricingOption,
                        serviceData.pricingType === 'hourly' && styles.pricingOptionSelected
                      ]}
                      onPress={() => setServiceData(prev => ({ ...prev, pricingType: 'hourly' }))}
                    >
                      <Text style={[
                        styles.pricingOptionText,
                        serviceData.pricingType === 'hourly' && styles.pricingOptionTextSelected
                      ]}>
                        Hourly
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.priceInputContainer}>
                  <Text style={styles.pricingLabel}>Amount (₦) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={serviceData.pricingType === 'hourly' ? "Price per hour" : "Fixed price"}
                    keyboardType="numeric"
                    value={serviceData.price}
                    onChangeText={(text) => setServiceData(prev => ({ ...prev, price: text }))}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Category *</Text>
              {loadingCategories ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <View style={styles.categoryContainer}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        serviceData.category_id === category.id.toString() && styles.categoryButtonSelected
                      ]}
                      onPress={() => handleCategorySelect(category)}
                    >
                      <Text style={[
                        styles.categoryText,
                        serviceData.category_id === category.id.toString() && styles.categoryTextSelected
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Service Specific Details */}
          {serviceData.category_id && categoryFields.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Details</Text>
              {categoryFields.map((field) => (
                <View key={field.key} style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {field.label} {field.required && '*'}
                  </Text>
                  {field.type === 'select' ? (
                    <View style={styles.optionsContainer}>
                      {field.options?.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.optionButton,
                            serviceData.attributes[field.key] === option && styles.optionButtonSelected
                          ]}
                          onPress={() => handleAttributeChange(field.key, option)}
                        >
                          <Text style={[
                            styles.optionText,
                            serviceData.attributes[field.key] === option && styles.optionTextSelected
                          ]}>
                            {option}
                          </Text>
                          {serviceData.attributes[field.key] === option && (
                            <Ionicons name="checkmark" size={16} color="#fff" style={styles.checkIcon} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <TextInput
                      style={styles.textInput}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                      value={serviceData.attributes[field.key] || ''}
                      onChangeText={(text) => handleAttributeChange(field.key, text)}
                    />
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            <Text style={styles.submitButtonText}>
              {uploading ? "Creating Service..." : "Create Service Listing"}
            </Text>
          </TouchableOpacity>

          {/* Bottom padding for safe area */}
          <View style={styles.bottomPadding} />
        </ScrollView>
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
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
    color: "#111",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    lineHeight: 20,
  },
  imagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imageWrapper: {
    width: (width - 60) / 2,
    position: "relative",
  },
  image: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 12,
    zIndex: 1,
  },
  addImageButton: {
    width: (width - 60) / 2,
    height: 120,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9ff",
  },
  addImageText: {
    marginTop: 8,
    color: "#007AFF",
    fontWeight: "500",
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  pricingLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#333",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  pricingRow: {
    flexDirection: "row",
    gap: 15,
  },
  pricingTypeContainer: {
    flex: 1,
  },
  pricingOptions: {
    flexDirection: "row",
    gap: 8,
  },
  pricingOption: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    alignItems: "center",
  },
  pricingOptionSelected: {
    backgroundColor: "#007AFF",
  },
  pricingOptionText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  pricingOptionTextSelected: {
    color: "#fff",
  },
  priceInputContainer: {
    flex: 1,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f1f1f1",
    borderRadius: 20,
    marginBottom: 5,
  },
  categoryButtonSelected: {
    backgroundColor: "#007AFF",
  },
  categoryText: {
    fontSize: 12,
    color: "#666",
  },
  categoryTextSelected: {
    color: "#fff",
    fontWeight: "500",
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionButtonSelected: {
    backgroundColor: "#007AFF",
  },
  optionText: {
    fontSize: 14,
    color: "#666",
  },
  optionTextSelected: {
    color: "#fff",
    fontWeight: "500",
  },
  checkIcon: {
    marginLeft: 4,
  },
  submitButton: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
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