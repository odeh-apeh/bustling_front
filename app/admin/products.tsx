// app/(admin)/products.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  RefreshControl,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView} from 'react-native-safe-area-context';
import { BASE_URL } from '@/helpers/core-service';


const { width, height } = Dimensions.get('window');
const API_URL = `${BASE_URL}`; // Your server IP

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  type: 'product' | 'service';
  status?: string;
  seller_id: number;
  seller_name: string;
  seller_phone: string;
  seller_email?: string;
  category_name?: string;
  image_url?: string;
  images?: any[];
  location?: string;
  created_at: string;
  attributes?: any;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function ProductsManagementScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const limit = 20;

  useEffect(() => {
    fetchProducts();
  }, [page, typeFilter, statusFilter]);

  const fetchProducts = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      let url = `${API_URL}/api/admin/products?page=${page}&limit=${limit}`;
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      if (typeFilter !== 'all') {
        url += `&type=${typeFilter}`;
      }
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }

      console.log('Fetching products from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Products data received:', data);
        
        setProducts(data.products || []);
        setPagination(data.pagination || { total: 0, page, limit, pages: 0 });
      } else if (response.status === 403) {
        router.replace('/auth/account-support');
      } else {
        Alert.alert('Error', 'Failed to load products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchProducts();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const handleDeleteProduct = (deleteType: 'soft' | 'hard') => {
    if (!selectedProduct) return;

    const messages = {
      soft: `Soft delete ${selectedProduct.name}? (Data will be preserved)`,
      hard: `Permanently delete ${selectedProduct.name}? This action cannot be undone!`
    };

    Alert.alert(
      'Confirm Deletion',
      messages[deleteType],
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: deleteType === 'hard' ? 'Delete Permanently' : 'Soft Delete',
          style: deleteType === 'hard' ? 'destructive' : 'default',
          onPress: () => executeDeleteProduct(deleteType),
        },
      ]
    );
  };

  const executeDeleteProduct = async (deleteType: 'soft' | 'hard') => {
    if (!selectedProduct) return;

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(
        `${API_URL}/api/admin/products/${selectedProduct.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deleteType: deleteType
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', data.message || 'Product deleted successfully');
        fetchProducts();
        setModalVisible(false);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      Alert.alert('Error', 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getProductTypeColor = (type: string) => {
    return type === 'service' ? '#5856D6' : '#34C759';
  };

  const getProductTypeIcon = (type: string) => {
    return type === 'service' ? 'construct' : 'cube';
  };

  const getProductStatusColor = (status?: string) => {
    if (!status) return '#FF9500';
    switch (status.toLowerCase()) {
      case 'active': return '#34C759';
      case 'deleted': return '#FF3B30';
      case 'sold': return '#5856D6';
      case 'pending': return '#FF9500';
      default: return '#FF9500';
    }
  };

  const getProductImage = (product: Product) => {
    if (product.image_url) return product.image_url;
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return `${API_URL}/uploads/${product.images[0]}`;
    }
    return null;
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productItem}
      onPress={() => {
        setSelectedProduct(item);
        setModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      {/* Product Image */}
      <View style={styles.productImageContainer}>
        {getProductImage(item) ? (
          <Image 
            source={{ uri: getProductImage(item) as string }} 
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImagePlaceholder, { backgroundColor: getProductTypeColor(item.type) + '20' }]}>
            <Ionicons 
              name={getProductTypeIcon(item.type)} 
              size={30} 
              color={getProductTypeColor(item.type)} 
            />
          </View>
        )}
        
        <View style={[styles.productTypeBadge, { backgroundColor: getProductTypeColor(item.type) }]}>
          <Text style={styles.productTypeText}>
            {item.type === 'service' ? 'Service' : 'Product'}
          </Text>
        </View>
      </View>
      
      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>
            {formatCurrency(item.price)}
          </Text>
        </View>
        
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description || 'No description'}
        </Text>
        
        <View style={styles.productSeller}>
          <Ionicons name="person" size={12} color="#666" />
          <Text style={styles.sellerText} numberOfLines={1}>
            {item.seller_name} • {item.seller_phone}
          </Text>
        </View>
        
        {item.location && (
          <View style={styles.productLocation}>
            <Ionicons name="location" size={12} color="#666" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        )}
        
        {item.category_name && (
          <View style={styles.productCategory}>
            <Ionicons name="pricetag" size={12} color="#666" />
            <Text style={styles.categoryText}>
              {item.category_name}
            </Text>
          </View>
        )}
        
        <View style={styles.productFooter}>
          <View style={[styles.statusBadge, { backgroundColor: getProductStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getProductStatusColor(item.status) }]}>
              {item.status || 'Active'}
            </Text>
          </View>
          
          <Text style={styles.productDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={80} color="#e0e0e0" />
      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try a different search' : 'No products or services uploaded yet'}
      </Text>
      {searchQuery && (
        <TouchableOpacity 
          style={styles.clearSearchButton}
          onPress={() => setSearchQuery('')}
        >
          <Text style={styles.clearSearchText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!pagination || pagination.pages <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
          onPress={() => page > 1 && setPage(page - 1)}
          disabled={page === 1}
        >
          <Ionicons name="chevron-back" size={20} color={page === 1 ? '#ccc' : '#0A6BFF'} />
        </TouchableOpacity>
        
        <Text style={styles.pageInfo}>
          Page {page} of {pagination.pages}
        </Text>
        
        <TouchableOpacity
          style={[styles.pageButton, page === pagination.pages && styles.pageButtonDisabled]}
          onPress={() => page < pagination.pages && setPage(page + 1)}
          disabled={page === pagination.pages}
        >
          <Ionicons name="chevron-forward" size={20} color={page === pagination.pages ? '#ccc' : '#0A6BFF'} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A6BFF" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen 
        options={{ 
          title: 'Products & Services',
          headerStyle: {
            backgroundColor: '#0A6BFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }} 
      />
      
      {/* Fixed Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products/services..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#999"
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="filter" size={22} color="#0A6BFF" />
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsOverview}>
          <View style={styles.statOverviewItem}>
            <Text style={styles.statOverviewValue}>{pagination?.total || 0}</Text>
            <Text style={styles.statOverviewLabel}>Total</Text>
          </View>
          <View style={styles.statOverviewDivider} />
          <View style={styles.statOverviewItem}>
            <Text style={styles.statOverviewValue}>
              {products.filter(p => p.type === 'product').length}
            </Text>
            <Text style={styles.statOverviewLabel}>Products</Text>
          </View>
          <View style={styles.statOverviewDivider} />
          <View style={styles.statOverviewItem}>
            <Text style={styles.statOverviewValue}>
              {products.filter(p => p.type === 'service').length}
            </Text>
            <Text style={styles.statOverviewLabel}>Services</Text>
          </View>
        </View>
      </View>

      {/* Scrollable Products List */}
      <View style={styles.listContainer}>
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0A6BFF']}
              tintColor="#0A6BFF"
            />
          }
          showsVerticalScrollIndicator={true}
          style={styles.flatList}
        />
      </View>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Products</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.filterLabel}>Type</Text>
            {['all', 'product', 'service'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={styles.filterOption}
                onPress={() => {
                  setTypeFilter(filter);
                  setFilterModalVisible(false);
                  setPage(1);
                }}
              >
                <View style={styles.filterRadio}>
                  {typeFilter === filter && (
                    <View style={styles.filterRadioSelected} />
                  )}
                </View>
                <Text style={styles.filterOptionText}>
                  {filter === 'all' ? 'All Types' : 
                   filter === 'product' ? 'Products Only' : 'Services Only'}
                </Text>
              </TouchableOpacity>
            ))}
            
            <Text style={[styles.filterLabel, { marginTop: 20 }]}>Status</Text>
            {['all', 'active', 'deleted'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(filter);
                  setFilterModalVisible(false);
                  setPage(1);
                }}
              >
                <View style={styles.filterRadio}>
                  {statusFilter === filter && (
                    <View style={styles.filterRadioSelected} />
                  )}
                </View>
                <Text style={styles.filterOptionText}>
                  {filter === 'all' ? 'All Status' : 
                   filter === 'active' ? 'Active Only' : 'Deleted Only'}
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => {
                setTypeFilter('all');
                setStatusFilter('all');
                setFilterModalVisible(false);
                setPage(1);
              }}
            >
              <Text style={styles.clearFilterText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Product Action Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => !actionLoading && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Product Actions</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                disabled={actionLoading}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <>
                <ScrollView 
                  style={styles.productModalScroll}
                  showsVerticalScrollIndicator={true}
                >
                  <View style={styles.productModalHeader}>
                    {getProductImage(selectedProduct) ? (
                      <Image 
                        source={{ uri: getProductImage(selectedProduct) as string }} 
                        style={styles.productModalImage}
                      />
                    ) : (
                      <View style={[styles.productModalImagePlaceholder, { backgroundColor: getProductTypeColor(selectedProduct.type) + '20' }]}>
                        <Ionicons 
                          name={getProductTypeIcon(selectedProduct.type)} 
                          size={50} 
                          color={getProductTypeColor(selectedProduct.type)} 
                        />
                      </View>
                    )}
                    
                    <View style={styles.productModalTypeBadge}>
                      <Text style={styles.productModalTypeText}>
                        {selectedProduct.type === 'service' ? 'SERVICE' : 'PRODUCT'}
                      </Text>
                    </View>
                    
                    <Text style={styles.productModalName}>
                      {selectedProduct.name}
                    </Text>
                    
                    <Text style={styles.productModalPrice}>
                      {formatCurrency(selectedProduct.price)}
                    </Text>
                  </View>

                  <View style={styles.productModalDetails}>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Description</Text>
                      <Text style={styles.detailSectionContent}>
                        {selectedProduct.description || 'No description available'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Ionicons name="person" size={16} color="#666" />
                        <Text style={styles.detailLabel}>Seller:</Text>
                        <Text style={styles.detailValue}>{selectedProduct.seller_name}</Text>
                      </View>
                      <Text style={styles.detailPhone}>{selectedProduct.seller_phone}</Text>
                    </View>

                    {selectedProduct.seller_email && (
                      <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                          <Ionicons name="mail" size={16} color="#666" />
                          <Text style={styles.detailLabel}>Email:</Text>
                          <Text style={styles.detailValue}>{selectedProduct.seller_email}</Text>
                        </View>
                      </View>
                    )}

                    {selectedProduct.location && (
                      <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                          <Ionicons name="location" size={16} color="#666" />
                          <Text style={styles.detailLabel}>Location:</Text>
                          <Text style={styles.detailValue}>{selectedProduct.location}</Text>
                        </View>
                      </View>
                    )}

                    {selectedProduct.category_name && (
                      <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                          <Ionicons name="pricetag" size={16} color="#666" />
                          <Text style={styles.detailLabel}>Category:</Text>
                          <Text style={styles.detailValue}>{selectedProduct.category_name}</Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Ionicons name="calendar" size={16} color="#666" />
                        <Text style={styles.detailLabel}>Created:</Text>
                        <Text style={styles.detailValue}>{formatDate(selectedProduct.created_at)}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Ionicons name="shield" size={16} color="#666" />
                        <Text style={styles.detailLabel}>Status:</Text>
                        <View style={[styles.statusBadgeModal, { backgroundColor: getProductStatusColor(selectedProduct.status) + '20' }]}>
                          <Text style={[styles.statusTextModal, { color: getProductStatusColor(selectedProduct.status) }]}>
                            {selectedProduct.status || 'Active'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {selectedProduct.attributes && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Attributes</Text>
                        <Text style={styles.detailSectionContent}>
                          {JSON.stringify(selectedProduct.attributes, null, 2)}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.softDeleteButton]}
                    onPress={() => handleDeleteProduct('soft')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="archive" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Soft Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.hardDeleteButton]}
                    onPress={() => handleDeleteProduct('hard')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="trash" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Delete Permanently</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerSection: {
    backgroundColor: '#fff',
  },
  listContainer: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    paddingTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#333',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsOverview: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 8,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statOverviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  statOverviewValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  
  statOverviewLabel: {
    fontSize: 10,
    color: '#666',
  },
  statOverviewDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
    minHeight: 100, // Reduced from 140
  },
  productImageContainer: {
    width: 90, // Reduced from 120
    position: 'relative',
  },
  
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  
  productTypeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productTypeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  
  productInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A6BFF',
  },
  
  productDescription: {
    fontSize: 11,
    color: '#666',
    lineHeight: 14,
    marginBottom: 4,
  },
  
  productSeller: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  sellerText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  
  productLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  
  locationText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  productCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  categoryText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
   statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  
  productDate: {
    fontSize: 9,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  clearSearchButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0A6BFF',
    borderRadius: 8,
  },
  clearSearchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  pageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  pageButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.6,
  },
  actionModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.85,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  filterRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0A6BFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRadioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0A6BFF',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333',
  },
  clearFilterButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  clearFilterText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  productModalScroll: {
    maxHeight: height * 0.5,
  },
  productModalHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productModalImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 10,
  },
  productModalImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  productModalTypeBadge: {
    backgroundColor: '#0A6BFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  productModalTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  productModalName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  productModalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0A6BFF',
  },
  productModalDetails: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailSectionContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  detailPhone: {
    fontSize: 14,
    color: '#0A6BFF',
    fontWeight: '500',
  },
  statusBadgeModal: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusTextModal: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  softDeleteButton: {
    backgroundColor: '#FF9500',
  },
  hardDeleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});