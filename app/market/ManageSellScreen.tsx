import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Stack, useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BASE_URL } from '@/helpers/core-service';
import { useToast } from '@/contexts/toast-content';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

type Product = {
  id: string;
  title: string;
  price: string;
  status: 'active' | 'inactive' | 'sold_out';
  images: string[] | string;
  created_at: string;
  views: number;
  orders: number;
  description?: string;
  category?: string;
  category_id?: number;
  location?: string;
  attributes?: Record<string, any>;
  type?:string
};

type EditProductForm = {
  title: string;
  price: string;
  description: string;
  status: 'active' | 'inactive';
  category_id: number;
  category_name: string;
  location: string;
  attributes: Record<string, any>;
};

type CategoryAttribute = {
  key: string;
  type: 'text' | 'textarea' | 'select';
  label: string;
  required: boolean;
  options?: string[];
};

type Category = {
  id: number;
  name: string;
  type: string;
  attributes: CategoryAttribute[];
};

export default function ManageProductsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // Image states
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  
  // Category states
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedCategoryAttributes, setSelectedCategoryAttributes] = useState<CategoryAttribute[]>([]);
  
  // Edit form state
  const [editForm, setEditForm] = useState<EditProductForm>({
    title: '',
    price: '',
    description: '',
    status: 'active',
    category_id: 0,
    category_name: '',
    location: '',
    attributes: {},
  });

  // Request image permissions
  const requestImagePermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant camera roll permissions to update product images.');
        return false;
      }
      return true;
    }
    return true;
  };

  // Pick images from library
  const pickImages = async () => {
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets) {
      setNewImages([...newImages, ...result.assets]);
    }
  };

  // Remove selected new image
  const removeNewImage = (index: number) => {
    const updated = [...newImages];
    updated.splice(index, 1);
    setNewImages(updated);
  };

  // Remove existing image
  const removeExistingImage = (index: number) => {
    const updated = [...existingImages];
    updated.splice(index, 1);
    setExistingImages(updated);
  };

  // Helper function to extract and construct image URL
  const getImageUrl = (images: string[] | string) => {
    if (!images) return null;
    
    let firstImage = null;
    
    try {
      if (Array.isArray(images) && images.length > 0) {
        firstImage = images[0];
      }
      else if (typeof images === 'string' && images.trim()) {
        if (images.startsWith('[') && images.endsWith(']')) {
          const parsed = JSON.parse(images);
          if (Array.isArray(parsed) && parsed.length > 0) {
            firstImage = parsed[0];
          }
        } else {
          firstImage = images;
        }
      }
    } catch (error) {
      console.error('Error parsing images:', error);
      return null;
    }
    
    if (!firstImage) return null;
    
    let filename = String(firstImage);
    filename = filename.replace(/\\/g, '')
                       .replace(/^["']|["']$/g, '')
                       .replace(/^\[|\]$/g, '')
                       .trim();
    
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename;
    }
    
    const cleanPath = filename.replace(/^\/+/, '');
    if (cleanPath.startsWith('uploads/')) {
      return `${BASE_URL}/${cleanPath}`;
    }
    
    return `${BASE_URL}/uploads/${cleanPath}`;
  };

  // Parse attributes from category - handles both JSON string and already parsed objects
const parseCategoryAttributes = (attributes: any): CategoryAttribute[] => {
  if (!attributes) return [];
  
  // If it's already an array, return it directly
  if (Array.isArray(attributes)) {
    return attributes;
  }
  
  // If it's a string, try to parse it
  if (typeof attributes === 'string') {
    try {
      const parsed = JSON.parse(attributes);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error parsing category attributes string:', error);
      return [];
    }
  }
  
  // If it's an object, try to convert to array
  if (typeof attributes === 'object') {
    // If it's an object with numeric keys (array-like)
    if (attributes !== null && !Array.isArray(attributes)) {
      const values = Object.values(attributes);
      if (values.length > 0 && (values[0] as any)?.key) {
        return values as CategoryAttribute[];
      }
    }
  }
  
  return [];
};

  // Fetch categories
  // Fetch categories
const fetchCategories = async (type:string) => {
  try {
    setLoadingCategories(true);
    const response = await fetch(`${BASE_URL}/api/products/categories/with-attributes?type=${type}`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (data.success && data.categories) {
      // Parse attributes for each category - handle both string and object
      const parsedCategories = data.categories.map((cat: any) => {
        let parsedAttributes: CategoryAttribute[] = [];
        
        // Check if attributes is already an array or needs parsing
        if (Array.isArray(cat.attributes)) {
          parsedAttributes = cat.attributes;
        } else if (typeof cat.attributes === 'string') {
          try {
            parsedAttributes = JSON.parse(cat.attributes);
          } catch (e) {
            console.error(`Error parsing attributes for category ${cat.name}:`, e);
            parsedAttributes = [];
          }
        } else if (typeof cat.attributes === 'object' && cat.attributes !== null) {
          // If it's an object but not an array, convert to array
          parsedAttributes = Object.values(cat.attributes);
        }
        
        return {
          ...cat,
          attributes: parsedAttributes,
        };
      });
      setCategories(parsedCategories);
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
  } finally {
    setLoadingCategories(false);
  }
};

  // Fetch user's products
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/products/my-products`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products);
        setImageErrors({});
      } else {
        showToast(data.message || 'Failed to load products', 'error');
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch single product by ID - FIXED VERSION
const fetchProductsById = async (id: string) => {
  try {
    setLoading(true);
    const response = await fetch(`${BASE_URL}/api/products/${Number(id)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('📦 Product by ID response:', data);
    
    if (response.ok && data) {
      // The API returns a single product, not an array
      // Convert single product to array format for consistent handling
      const product = {
        id: data.id,
        title: data.title,
        price: data.price,
        description: data.description,
        category: data.category,
        category_id: data.category_id,
        location: data.location,
        status: data.status || 'active',
        images: data.images || [],
        attributes: data.attributes || {},
        type: data.type || 'product',
        created_at: data.created_at,
        views: data.views || 0,
        orders: data.orders || 0,
      };
      
      setProducts([product]); // Set as array with single product
      setImageErrors({});
      
      // Also populate the edit form if in edit mode
      if (params.id) {
        // Parse images
        let parsedImages: string[] = [];
        if (product.images) {
          if (Array.isArray(product.images)) {
            parsedImages = product.images;
          } else if (typeof product.images === 'string') {
            try {
              parsedImages = JSON.parse(product.images);
            } catch (e) {
              parsedImages = [product.images];
            }
          }
        }
        
        // Parse attributes
        let parsedAttributes: Record<string, any> = {};
        if (product.attributes) {
          try {
            parsedAttributes = typeof product.attributes === 'string' 
              ? JSON.parse(product.attributes) 
              : product.attributes;
          } catch (error) {
            console.error('Error parsing attributes:', error);
          }
        }
        
        setSelectedProduct(product);
        setExistingImages(parsedImages);
        setEditForm({
          title: product.title || '',
          price: product.price?.toString().replace('₦', '').replace(',', '') || '',
          description: product.description || '',
          status: product.status === 'active' ? 'active' : 'inactive',
          category_id: product.category_id || 0,
          category_name: product.category || '',
          location: product.location || '',
          attributes: parsedAttributes,
        });
        
        // Fetch categories for the dropdown
        if (categories.length === 0) {
          fetchCategories(product.type || 'product');
        }
      }
    } else {
      showToast(data.message || 'Failed to load product', 'error');
      setProducts([]);
    }
  } catch (error: any) {
    console.error('Error fetching product:', error);
    showToast('Network error. Please try again.', 'error');
    setProducts([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  // Update product with images and attributes
  const updateProduct = async () => {
    if (!selectedProduct) return;
    
    setUpdating(true);
    
    try {
      const formData = new FormData();
      
      // ✅ Required fields - always add with validation
      if (editForm.title?.trim()) {
        formData.append('title', editForm.title.trim());
      } else {
        showToast('Product title is required', 'error');
        setUpdating(false);
        return;
      }
      
      if (editForm.price && !isNaN(parseFloat(editForm.price))) {
        formData.append('price', editForm.price.toString());
      } else {
        showToast('Valid price is required', 'error');
        setUpdating(false);
        return;
      }
      
      if (editForm.description?.trim()) {
        formData.append('description', editForm.description.trim());
      } else {
        showToast('Product description is required', 'error');
        setUpdating(false);
        return;
      }
      
      if (editForm.category_id) {
        formData.append('category', editForm.category_id.toString());
      } else {
        showToast('Category is required', 'error');
        setUpdating(false);
        return;
      }
      
      // ✅ Optional fields - only add if they exist
      if (editForm.location?.trim()) {
        formData.append('location', editForm.location.trim());
      }
      
      if (editForm.status) {
        formData.append('status', editForm.status);
      }
      
      // ✅ Attributes - ensure it's a valid JSON string
      if (editForm.attributes && Object.keys(editForm.attributes).length > 0) {
        formData.append('attributes', JSON.stringify(editForm.attributes));
      } else {
        formData.append('attributes', JSON.stringify({}));
      }
      
      // ✅ Existing images - ensure it's a valid JSON array
      if (existingImages && existingImages.length > 0) {
        formData.append('existing_images', JSON.stringify(existingImages));
      } else {
        formData.append('existing_images', JSON.stringify([]));
      }
      
      // ✅ New images - validate each image before appending
      for (let i = 0; i < newImages.length; i++) {
        const image = newImages[i];
        
        // Validate image object has required properties
        if (image && image.uri) {
          const filename = image.uri.split('/').pop() || `image_${Date.now()}_${i}.jpg`;
          const fileType = image.mimeType || 'image/jpeg';
          
          // For React Native, you need to create a proper file object
          formData.append('images', {
            uri: image.uri,
            name: filename,
            type: fileType,
          } as any);
        } else {
          console.warn(`Skipping invalid image at index ${i}:`, image);
        }
      }
      
      // ✅ Log FormData contents for debugging (optional)
      console.log('📤 Updating product with FormData:');
      for (let pair of (formData as any)._parts) {
        console.log(`${pair[0]}:`, pair[1]);
      }
      
      const response = await fetch(`${BASE_URL}/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          // DO NOT set Content-Type header - let browser set it with boundary for FormData
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Product updated successfully!', 'success');
        setEditModalVisible(false);
        setNewImages([]);
        setExistingImages([]);
        fetchProducts();
      } else {
        showToast(data.error || data.message || 'Failed to update product', 'error');
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      showToast(error.message || 'Network error. Please try again.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Delete product
  const deleteProduct = async () => {
    if (!selectedProduct) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`${BASE_URL}/api/products/${selectedProduct.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Product deleted successfully!', 'success');
        setDeleteConfirmVisible(false);
        setSelectedProduct(null);
        fetchProducts();
      } else {
        showToast(data.message || 'Failed to delete product', 'error');
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Toggle product status
  const toggleProductStatus = async (product: Product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`${BASE_URL}/api/products/${product.id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast(`Product ${newStatus === 'active' ? 'activated' : 'deactivated'}!`, 'success');
        fetchProducts();
      } else {
        showToast(data.message || 'Failed to update status', 'error');
      }
    } catch (error: any) {
      console.error('Error toggling status:', error);
      showToast('Network error. Please try again.', 'error');
    }
  };

  // Update attribute value
  const updateAttribute = (key: string, value: string) => {
    setEditForm({
      ...editForm,
      attributes: {
        ...editForm.attributes,
        [key]: value,
      },
    });
  };

  // Check if required attributes are filled
  const areRequiredAttributesFilled = () => {
    for (const attr of selectedCategoryAttributes) {
      if (attr.required && (!editForm.attributes[attr.key] || editForm.attributes[attr.key].trim() === '')) {
        showToast(`Please fill in "${attr.label}"`, 'error');
        return false;
      }
    }
    return true;
  };

  // Open edit modal with product data
  const openEditModal = (product: Product) => {
    let parsedImages: string[] = [];
    try {
      if (Array.isArray(product.images)) {
        parsedImages = product.images;
      } else if (typeof product.images === 'string') {
        if (product.images.startsWith('[')) {
          parsedImages = JSON.parse(product.images);
        } else {
          parsedImages = [product.images];
        }
      }
    } catch (error) {
      console.error('Error parsing images:', error);
      parsedImages = [];
    }
    
    let parsedAttributes: Record<string, any> = {};
    if (product.attributes) {
      try {
        parsedAttributes = typeof product.attributes === 'string' 
          ? JSON.parse(product.attributes) 
          : product.attributes;
      } catch (error) {
        console.error('Error parsing attributes:', error);
      }
    }
    
    setSelectedProduct(product);
    setExistingImages(parsedImages);
    setNewImages([]);
    setEditForm({
      title: product.title,
      price: product.price.toString().replace('₦', '').replace(',', ''),
      description: product.description || '',
      status: product.status === 'active' ? 'active' : 'inactive',
      category_id: product.category_id || 0,
      category_name: product.category || '',
      location: product.location || '',
      attributes: parsedAttributes,
    });
    
    // Find category attributes
    const selectedCat = categories.find(c => c.id === (product.category_id || 0));
    if (selectedCat?.attributes) {
      setSelectedCategoryAttributes(selectedCat.attributes);
    } else {
      setSelectedCategoryAttributes([]);
    }
    
    setEditModalVisible(true);
    
    if (categories.length === 0) {
      fetchCategories(product.type ?? 'product');
    }
  };

  const openDeleteConfirm = (product: Product) => {
    setSelectedProduct(product);
    setDeleteConfirmVisible(true);
  };

  const selectCategory = (category: Category) => {
    const newAttributes: Record<string, any> = {};
    
    // Initialize new attributes with existing values if they match, otherwise empty
    if (category.attributes) {
      category.attributes.forEach(attr => {
        newAttributes[attr.key] = editForm.attributes[attr.key] || '';
      });
    }
    
    setEditForm({
      ...editForm,
      category_id: category.id,
      category_name: category.name,
      attributes: newAttributes,
    });
    setSelectedCategoryAttributes(category.attributes || []);
    setShowCategoryDropdown(false);
  };

  const params = useLocalSearchParams();
  


useFocusEffect(
  useCallback(() => {
    const loadData = async () => {
      if (params.id && params.id !== 'undefined' && params.id !== 'null') {
        // Edit mode - fetch specific product by ID
        console.log('🔄 Edit mode - fetching product ID:', params.id);
        await fetchProductsById(params.id as string);
      } else {
        // Add mode - fetch all products
        console.log('🔄 Add mode - fetching all products');
        await fetchProducts();
      }
    };
    
    loadData();
  }, [params.id])
);
  

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'inactive': return '#F59E0B';
      case 'sold_out': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'sold_out': return 'Sold Out';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isRequired = (key: string) => {
    const attr = selectedCategoryAttributes.find(a => a.key === key);
    return attr?.required || false;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading your products...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
                  <Stack.Screen 
                           options={{
                             headerShown:true,
                             header: () => (
                               <View
                                 style={{
                                   height: 90,
                                   backgroundColor: '#3986f9',
                                   flexDirection: 'row',
                                   alignItems: 'flex-end',
                                   paddingHorizontal: 16,
                                   paddingBottom: 14,
                                 }}
                               >
                                 <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
                                   <Ionicons name="arrow-back" size={24} color="#fff" />
                                 </TouchableOpacity>
                         
                                 <Text
                                   style={{
                                     color: '#fff',
                                     fontSize: 20,
                                     fontWeight: '600',
                                   }}
                                 >
                                  Manage Products
                                 </Text>
                               </View>
                             ),
                           }} />
      
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="cube-outline" size={64} color="#ccc" />
              </View>
              <Text style={styles.emptyTitle}>No Products Yet</Text>
              <Text style={styles.emptyText}>
                You haven&apos;t listed any products. Start selling today!
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/market/SellScreen')}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add New Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.headerStats}>
                <LinearGradient
                  colors={['#4a66e2', '#95d2fe']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.statsGradient}
                >
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{products.length}</Text>
                    <Text style={styles.statLabel}>Total Products</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {products.filter(p => p.status === 'active').length}
                    </Text>
                    <Text style={styles.statLabel}>Active</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {products.reduce((sum, p) => sum + (p.orders || 0), 0)}
                    </Text>
                    <Text style={styles.statLabel}>Total Orders</Text>
                  </View>
                </LinearGradient>
              </View>
              
              <View style={styles.productsList}>
                {products.map((product) => {
                  const imageUrl = getImageUrl(product.images);
                  const hasError = imageErrors[product.id];
                  
                  return (
                    <View key={product.id} style={styles.productCard}>
                      <TouchableOpacity
                        style={styles.productContent}
                        onPress={() => {}}
                        activeOpacity={0.7}
                      >
                        <View style={styles.productImageContainer}>
                          {imageUrl && !hasError ? (
                            <Image
                              source={{ uri: imageUrl }}
                              style={styles.productImage}
                              onError={() => {
                                setImageErrors(prev => ({ ...prev, [product.id]: true }));
                              }}
                            />
                          ) : (
                            <View style={styles.placeholderImage}>
                              <Ionicons name="image-outline" size={32} color="#ccc" />
                            </View>
                          )}
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(product.status) + '15' }]}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(product.status) }]} />
                            <Text style={[styles.statusBadgeText, { color: getStatusColor(product.status) }]}>
                              {getStatusText(product.status)}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.productInfo}>
                          <Text style={styles.productTitle} numberOfLines={2}>
                            {product.title}
                          </Text>
                          <Text style={styles.productPrice}>₦{parseFloat(product.price).toLocaleString()}</Text>
                          
                          <View style={styles.productMeta}>
                            <View style={styles.metaItem}>
                              <Ionicons name="eye-outline" size={12} color="#9CA3AF" />
                              <Text style={styles.metaText}>{product.views || 0}</Text>
                            </View>
                            <View style={styles.metaDot} />
                            <View style={styles.metaItem}>
                              <Ionicons name="cart-outline" size={12} color="#9CA3AF" />
                              <Text style={styles.metaText}>{product.orders || 0}</Text>
                            </View>
                            <View style={styles.metaDot} />
                            <View style={styles.metaItem}>
                              <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                              <Text style={styles.metaText}>{formatDate(product.created_at)}</Text>
                            </View>
                          </View>
                          
                          {product.category && (
                            <View style={styles.categoryTag}>
                              <Text style={styles.categoryTagText}>{product.category}</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                      
                      <View style={styles.productActions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.statusBtn]}
                          onPress={() => toggleProductStatus(product)}
                        >
                          <Ionicons 
                            name={product.status === 'active' ? "pause-circle-outline" : "play-circle-outline"} 
                            size={16} 
                            color={getStatusColor(product.status)} 
                          />
                          <Text style={[styles.actionBtnText, { color: getStatusColor(product.status) }]}>
                            {product.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.editBtn]}
                          onPress={() => openEditModal(product)}
                        >
                          <Ionicons name="create-outline" size={16} color="#0066CC" />
                          <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.deleteBtn]}
                          onPress={() => openDeleteConfirm(product)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Edit Product Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setEditModalVisible(false);
          setNewImages([]);
          setExistingImages([]);
        }}
      >
        <BlurView intensity={isIOS ? 40 : 70} tint="dark" style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setEditModalVisible(false);
              setNewImages([]);
              setExistingImages([]);
            }}
          />
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#4a66e2', '#95d2fe']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeaderGradient}
            >
              <Text style={styles.modalTitle}>Edit Product</Text>
              <TouchableOpacity onPress={() => {
                setEditModalVisible(false);
                setNewImages([]);
                setExistingImages([]);
              }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Image Section */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionCardTitle}>Product Images</Text>
                
                {(existingImages.length > 0 || newImages.length > 0) && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageGrid}>
                    {existingImages.map((img, index) => (
                      <View key={`existing-${index}`} style={styles.imageCard}>
                        <Image
                          source={{ uri: `${BASE_URL}/uploads/${img}` }}
                          style={styles.imagePreview}
                        />
                        <TouchableOpacity
                          style={styles.imageRemoveBtn}
                          onPress={() => removeExistingImage(index)}
                        >
                          <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {newImages.map((img, index) => (
                      <View key={`new-${index}`} style={styles.imageCard}>
                        <Image
                          source={{ uri: img.uri }}
                          style={styles.imagePreview}
                        />
                        <TouchableOpacity
                          style={styles.imageRemoveBtn}
                          onPress={() => removeNewImage(index)}
                        >
                          <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
                
                <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                  <Ionicons name="add-circle-outline" size={20} color="#0066CC" />
                  <Text style={styles.addImageBtnText}>Add Images</Text>
                </TouchableOpacity>
              </View>
              
              {/* Basic Info Section */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionCardTitle}>Basic Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Product Title <Text style={styles.requiredStar}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.title}
                    onChangeText={(text) => setEditForm({ ...editForm, title: text })}
                    placeholder="Enter product title"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Price (₦) <Text style={styles.requiredStar}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.price}
                    onChangeText={(text) => setEditForm({ ...editForm, price: text })}
                    placeholder="Enter price"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editForm.description}
                    onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                    placeholder="Describe your product"
                    multiline
                    numberOfLines={4}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              
              {/* Category Section */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionCardTitle}>Category</Text>
                <TouchableOpacity 
                  style={styles.categorySelector}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <View style={styles.categorySelectorLeft}>
                    <Ionicons name="folder-outline" size={20} color="#6B7280" />
                    <Text style={editForm.category_name ? styles.categorySelectorText : styles.categorySelectorPlaceholder}>
                      {editForm.category_name || 'Select a category'}
                    </Text>
                  </View>
                  <Ionicons name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
                </TouchableOpacity>
                
                {showCategoryDropdown && (
                  <View style={styles.categoryDropdown}>
                    {loadingCategories ? (
                      <View style={styles.dropdownLoading}>
                        <ActivityIndicator size="small" color="#0066CC" />
                        <Text style={styles.dropdownLoadingText}>Loading categories...</Text>
                      </View>
                    ) : categories.length > 0 ? (
                      categories.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryOption,
                            editForm.category_id === category.id && styles.categoryOptionActive
                          ]}
                          onPress={() => selectCategory(category)}
                        >
                          <Text style={[
                            styles.categoryOptionText,
                            editForm.category_id === category.id && styles.categoryOptionTextActive
                          ]}>
                            {category.name}
                          </Text>
                          {editForm.category_id === category.id && (
                            <Ionicons name="checkmark" size={18} color="#0066CC" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.dropdownEmpty}>
                        <Text style={styles.dropdownEmptyText}>No categories available</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              
              {/* Attributes Section - Using proper category attributes */}
              {selectedCategoryAttributes.length > 0 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Product Details</Text>
                  {selectedCategoryAttributes.map((attr) => (
                    <View key={attr.key} style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        {attr.label}
                        {attr.required && <Text style={styles.requiredStar}> *</Text>}
                      </Text>
                      {attr.type === 'textarea' ? (
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          value={editForm.attributes[attr.key] || ''}
                          onChangeText={(value) => updateAttribute(attr.key, value)}
                          placeholder={`Enter ${attr.label.toLowerCase()}`}
                          multiline
                          numberOfLines={3}
                          placeholderTextColor="#9CA3AF"
                        />
                      ) : attr.type === 'select' && attr.options ? (
                        <View style={styles.optionsGrid}>
                          {attr.options.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.optionChip,
                                editForm.attributes[attr.key] === option && styles.optionChipActive
                              ]}
                              onPress={() => updateAttribute(attr.key, option)}
                            >
                              <Text style={[
                                styles.optionChipText,
                                editForm.attributes[attr.key] === option && styles.optionChipTextActive
                              ]}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <TextInput
                          style={styles.input}
                          value={editForm.attributes[attr.key] || ''}
                          onChangeText={(value) => updateAttribute(attr.key, value)}
                          placeholder={`Enter ${attr.label.toLowerCase()}`}
                          placeholderTextColor="#9CA3AF"
                        />
                      )}
                    </View>
                  ))}
                </View>
              )}
              
              {/* Location & Status */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionCardTitle}>Additional Info</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.location}
                    onChangeText={(text) => setEditForm({ ...editForm, location: text })}
                    placeholder="Your location"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={styles.statusToggle}>
                    <TouchableOpacity
                      style={[
                        styles.statusToggleOption,
                        editForm.status === 'active' && styles.statusToggleActive
                      ]}
                      onPress={() => setEditForm({ ...editForm, status: 'active' })}
                    >
                      <Ionicons name="checkmark-circle" size={18} color={editForm.status === 'active' ? "#fff" : "#10B981"} />
                      <Text style={[
                        styles.statusToggleText,
                        editForm.status === 'active' && styles.statusToggleTextActive
                      ]}>Active</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.statusToggleOption,
                        editForm.status === 'inactive' && styles.statusToggleInactive
                      ]}
                      onPress={() => setEditForm({ ...editForm, status: 'inactive' })}
                    >
                      <Ionicons name="pause-circle" size={18} color={editForm.status === 'inactive' ? "#fff" : "#F59E0B"} />
                      <Text style={[
                        styles.statusToggleText,
                        editForm.status === 'inactive' && styles.statusToggleTextActive
                      ]}>Inactive</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.updateBtn}
                onPress={updateProduct}
                disabled={updating}
              >
                <LinearGradient
                  colors={['#4a66e2', '#95d2fe']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.updateBtnGradient}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={20} color="#fff" />
                      <Text style={styles.updateBtnText}>Save Changes</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.modalBottomSpace} />
            </ScrollView>
          </View>
        </BlurView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <BlurView intensity={isIOS ? 40 : 70} tint="dark" style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDeleteConfirmVisible(false)}
          />
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconWrapper}>
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.confirmIconGradient}
              >
                <Ionicons name="warning" size={32} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.confirmTitle}>Delete Product?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete &quot;{selectedProduct?.title}&quot;? This action cannot be undone.
            </Text>
            
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={deleteProduct}
                disabled={updating}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.confirmDeleteGradient}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmDeleteText}>Delete</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  headerStats: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsGradient: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  productsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  productContent: {
    flexDirection: 'row',
    padding: 12,
  },
  productImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066CC',
    marginBottom: 6,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
  metaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  categoryTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryTagText: {
    fontSize: 10,
    color: '#6B7280',
  },
  productActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  statusBtn: {
    backgroundColor: '#F3F4F6',
  },
  editBtn: {
    backgroundColor: '#E6F2FF',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066CC',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
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
  modalHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  sectionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageCard: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderStyle: 'dashed',
    gap: 8,
  },
  addImageBtnText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  categorySelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categorySelectorText: {
    fontSize: 14,
    color: '#1F2937',
  },
  categorySelectorPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  categoryDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#fff',
    maxHeight: 200,
  },
  dropdownLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  dropdownLoadingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryOptionActive: {
    backgroundColor: '#E6F2FF',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  categoryOptionTextActive: {
    color: '#0066CC',
    fontWeight: '500',
  },
  dropdownEmpty: {
    padding: 12,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  optionChipActive: {
    backgroundColor: '#0066CC',
  },
  optionChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  optionChipTextActive: {
    color: '#fff',
  },
  statusToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  statusToggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    backgroundColor: '#F3F4F6',
  },
  statusToggleActive: {
    backgroundColor: '#10B981',
  },
  statusToggleInactive: {
    backgroundColor: '#F59E0B',
  },
  statusToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusToggleTextActive: {
    color: '#fff',
  },
  updateBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  updateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBottomSpace: {
    height: 20,
  },
  confirmModal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -width * 0.4 }, { translateY: -120 }],
    width: width * 0.8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  confirmIconWrapper: {
    marginBottom: 16,
  },
  confirmIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  confirmCancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  confirmDeleteBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  confirmDeleteGradient: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#fff',
    fontWeight: '600',
  },
});