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
  Modal,
  FlatList,
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
  }>;
}

export default function UploadProductScreen() {
  const router = useRouter();
  
  // Form state
  const [productData, setProductData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    category_id: "",
    attributes: {} as Record<string, string>,
  });
  
  const [images, setImages] = useState<string[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Request permissions and fetch categories
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setHasPermission(status === 'granted');
      }

      // Fetch categories from backend
      await fetchCategories();
    })();
  }, []);

  // Fetch categories with attributes from backend
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/products/categories/with-attributes?type=product`, {
        credentials: 'include',
      });
      
      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Categories data:', data);
      
      if (data.success) {
        console.log('✅ Categories loaded:', data.categories);
        setCategories(data.categories || []);
      } else {
        Alert.alert("Error", data.message || "Failed to load categories");
        setCategories([]);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      Alert.alert("Error", "Failed to load categories");
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Get fields for selected category
  const getCategoryFields = () => {
    if (!productData.category_id) return [];
    const category = categories.find(cat => cat.id && cat.id.toString() === productData.category_id);
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
        aspect: [1, 1],
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
    if (thumbnailIndex === index) {
      setThumbnailIndex(0);
    } else if (thumbnailIndex > index) {
      setThumbnailIndex(thumbnailIndex - 1);
    }
  };

  const setAsThumbnail = (index: number) => {
    setThumbnailIndex(index);
  };

  const handleAttributeChange = (key: string, value: string) => {
    setProductData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [key]: prev.attributes[key] === value ? '' : value
      }
    }));
  };

  const handleCategorySelect = (category: Category) => {
    console.log('🎯 Selected category:', category);
    
    const categoryId = category.id?.toString();
    
    if (!categoryId) {
      console.error('Category has no ID:', category);
      Alert.alert("Error", "Invalid category selected");
      return;
    }
    
    setProductData(prev => ({
      ...prev,
      category: category.name,
      category_id: categoryId,
      attributes: {} // Reset attributes when category changes
    }));
    setCategoryModalVisible(false);
  };

  const handleSubmit = async () => {
    if (!productData.title || !productData.description || !productData.price || !productData.category) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (images.length === 0) {
      Alert.alert("Error", "Please add at least one product image");
      return;
    }

    // Validate required attributes
    const categoryFields = getCategoryFields();
    const requiredFields = categoryFields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !productData.attributes[field.key]);

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
      
      // Basic product data
      formData.append('title', productData.title);
      formData.append('description', productData.description);
      formData.append('price', productData.price);
      formData.append('category', productData.category);
      formData.append('type', 'product');
      
      // Add attributes if any
      if (Object.keys(productData.attributes).length > 0) {
        formData.append('attributes', JSON.stringify(productData.attributes));
      }

      // Append images
      images.forEach((uri, index) => {
        formData.append('images', {
          uri,
          type: 'image/jpeg',
          name: `product_${Date.now()}_${index}.jpg`
        } as any);
      });

      // Upload to your backend
      const response = await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      
      if (data.message) {
        Alert.alert("Success", data.message);
        router.back();
      } else {
        Alert.alert("Error", data.message || "Failed to upload product");
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert("Error", "Failed to upload product. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const renderAttributeField = (field: any) => {
    switch (field.type) {
      case 'select':
        return (
          <View style={styles.optionsContainer}>
            {field.options?.map((option: string, optionIndex: number) => (
              <TouchableOpacity
                key={option ? `option-${option}` : `option-${optionIndex}`}
                style={[
                  styles.optionButton,
                  productData.attributes[field.key] === option && styles.optionButtonSelected
                ]}
                onPress={() => handleAttributeChange(field.key, option)}
              >
                <Text style={[
                  styles.optionText,
                  productData.attributes[field.key] === option && styles.optionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      
      case 'text':
      default:
        return (
          <TextInput
            style={styles.textInput}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={productData.attributes[field.key] || ''}
            onChangeText={(text) => handleAttributeChange(field.key, text)}
          />
        );
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
          <Text style={styles.headerTitle}>Upload Product</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Image Upload Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Images (Max 4)</Text>
            <Text style={styles.sectionSubtitle}>First image will be used as thumbnail</Text>
            
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
                  {thumbnailIndex === index && (
                    <View style={styles.thumbnailBadge}>
                      <Text style={styles.thumbnailText}>Thumbnail</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.thumbnailButton}
                    onPress={() => setAsThumbnail(index)}
                  >
                    <Text style={styles.thumbnailButtonText}>
                      {thumbnailIndex === index ? "Main" : "Set as Main"}
                    </Text>
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
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter product title"
                value={productData.title}
                onChangeText={(text) => setProductData(prev => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe your product..."
                multiline
                numberOfLines={4}
                value={productData.description}
                onChangeText={(text) => setProductData(prev => ({ ...prev, description: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price (₦) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter price"
                keyboardType="numeric"
                value={productData.price}
                onChangeText={(text) => setProductData(prev => ({ ...prev, price: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              {loadingCategories ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : categories.length === 0 ? (
                <Text style={styles.errorText}>No categories available</Text>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.categorySelector}
                    onPress={() => setCategoryModalVisible(true)}
                  >
                    <Text style={productData.category ? styles.categorySelectorText : styles.categorySelectorPlaceholder}>
                      {productData.category || "Select a category"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  
                  {/* Category Modal */}
                  <Modal
                    visible={categoryModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setCategoryModalVisible(false)}
                  >
                    <SafeAreaView style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Select Category</Text>
                          <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#000" />
                          </TouchableOpacity>
                        </View>
                        <FlatList
                          data={categories}
                          keyExtractor={(item) => item.id?.toString() || item.name}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[
                                styles.modalCategoryItem,
                                productData.category_id === item.id?.toString() && styles.modalCategoryItemSelected
                              ]}
                              onPress={() => handleCategorySelect(item)}
                            >
                              <Text style={[
                                styles.modalCategoryText,
                                productData.category_id === item.id?.toString() && styles.modalCategoryTextSelected
                              ]}>
                                {item.name}
                              </Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    </SafeAreaView>
                  </Modal>
                </>
              )}
            </View>
          </View>

          {/* Category Specific Attributes */}
          {productData.category_id && categoryFields.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Details</Text>
              {categoryFields.map((field, index) => (
                <View key={field.key ? `field-${field.key}` : `field-${index}`} style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {field.label} {field.required && '*'}
                  </Text>
                  {renderAttributeField(field)}
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
              {uploading ? "Uploading..." : "Upload Product"}
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
  thumbnailBadge: {
    position: "absolute",
    top: 5,
    left: 5,
    backgroundColor: "#007AFF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  thumbnailText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  thumbnailButton: {
    position: "absolute",
    bottom: 5,
    left: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: "center",
    zIndex: 1,
  },
  thumbnailButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
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
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9f9f9",
  },
  categorySelectorText: {
    fontSize: 16,
    color: "#333",
  },
  categorySelectorPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  errorText: {
    color: "#ff4444",
    fontSize: 14,
    textAlign: "center",
    padding: 10,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalCategoryItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalCategoryItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  modalCategoryText: {
    fontSize: 16,
    color: '#333',
  },
  modalCategoryTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});