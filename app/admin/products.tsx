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
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '@/helpers/core-service';

const { width, height } = Dimensions.get('window');
const API_URL = `${BASE_URL}`;

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

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
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
      <View style={styles.productImageContainer}>
        {getProductImage(item) ? (
          <Image 
            source={{ uri: getProductImage(item) as string }} 
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.productImagePlaceholder, { backgroundColor: getProductTypeColor(item.type) + '15' }]}>
            <Ionicons 
              name={getProductTypeIcon(item.type)} 
              size={32} 
              color={getProductTypeColor(item.type)} 
            />
          </View>
        )}
        
        <View style={[styles.productTypeBadge, { backgroundColor: getProductTypeColor(item.type) }]}>
          <Ionicons name={getProductTypeIcon(item.type)} size={10} color="#fff" />
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
        
        <View style={styles.productMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={12} color="#999" />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.seller_name}
            </Text>
          </View>
          
          {item.location && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color="#999" />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.productFooter}>
          <View style={[styles.statusBadge, { backgroundColor: getProductStatusColor(item.status) + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: getProductStatusColor(item.status) }]} />
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
      <View style={styles.emptyIconContainer}>
        <Ionicons name="cube-outline" size={60} color="#ccc" />
      </View>
      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try a different search term' : 'No products or services uploaded yet'}
      </Text>
      {searchQuery && (
        <TouchableOpacity 
          style={styles.clearSearchButton}
          onPress={() => {
            setSearchQuery('');
            setPage(1);
            fetchProducts();
          }}
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
        
        <View style={styles.pageInfoContainer}>
          <Text style={styles.pageInfo}>
            Page {page} of {pagination.pages}
          </Text>
        </View>
        
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
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#0A6BFF" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          header: () => (
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Products & Services</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.headerRefreshButton}>
                <Ionicons name="refresh-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      
      <View style={styles.headerSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products or services..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#999"
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setPage(1);
                fetchProducts();
              }}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="filter" size={20} color="#0A6BFF" />
            {(typeFilter !== 'all' || statusFilter !== 'all') && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsOverview}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pagination?.total || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {products.filter(p => p.type === 'product').length}
            </Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {products.filter(p => p.type === 'service').length}
            </Text>
            <Text style={styles.statLabel}>Services</Text>
          </View>
        </View>
      </View>

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
        showsVerticalScrollIndicator={false}
      />

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
            
            <ScrollView showsVerticalScrollIndicator={false}>
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
                    {typeFilter === filter && <View style={styles.filterRadioSelected} />}
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
                    {statusFilter === filter && <View style={styles.filterRadioSelected} />}
                  </View>
                  <Text style={styles.filterOptionText}>
                    {filter === 'all' ? 'All Status' : 
                     filter === 'active' ? 'Active Only' : 'Deleted Only'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => {
                setTypeFilter('all');
                setStatusFilter('all');
                setFilterModalVisible(false);
                setPage(1);
              }}
            >
              <Text style={styles.clearFilterText}>Clear All Filters</Text>
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
              <Text style={styles.modalTitle}>Product Details</Text>
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
                  showsVerticalScrollIndicator={false}
                  style={styles.productModalScroll}
                >
                  <View style={styles.productModalHeader}>
                    {getProductImage(selectedProduct) ? (
                      <Image 
                        source={{ uri: getProductImage(selectedProduct) as string }} 
                        style={styles.productModalImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.productModalImagePlaceholder, { backgroundColor: getProductTypeColor(selectedProduct.type) + '15' }]}>
                        <Ionicons 
                          name={getProductTypeIcon(selectedProduct.type)} 
                          size={50} 
                          color={getProductTypeColor(selectedProduct.type)} 
                        />
                      </View>
                    )}
                    
                    <View style={[styles.productModalTypeBadge, { backgroundColor: getProductTypeColor(selectedProduct.type) }]}>
                      <Ionicons name={getProductTypeIcon(selectedProduct.type)} size={14} color="#fff" />
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

                    <View style={styles.detailCard}>
                      <View style={styles.detailRow}>
                        <Ionicons name="person-outline" size={18} color="#666" />
                        <Text style={styles.detailLabel}>Seller:</Text>
                        <Text style={styles.detailValue}>{selectedProduct.seller_name}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={18} color="#666" />
                        <Text style={styles.detailLabel}>Phone:</Text>
                        <Text style={styles.detailValue}>{selectedProduct.seller_phone}</Text>
                      </View>

                      {selectedProduct.seller_email && (
                        <View style={styles.detailRow}>
                          <Ionicons name="mail-outline" size={18} color="#666" />
                          <Text style={styles.detailLabel}>Email:</Text>
                          <Text style={styles.detailValue}>{selectedProduct.seller_email}</Text>
                        </View>
                      )}

                      {selectedProduct.location && (
                        <View style={styles.detailRow}>
                          <Ionicons name="location-outline" size={18} color="#666" />
                          <Text style={styles.detailLabel}>Location:</Text>
                          <Text style={styles.detailValue}>{selectedProduct.location}</Text>
                        </View>
                      )}

                      {selectedProduct.category_name && (
                        <View style={styles.detailRow}>
                          <Ionicons name="pricetag-outline" size={18} color="#666" />
                          <Text style={styles.detailLabel}>Category:</Text>
                          <Text style={styles.detailValue}>{selectedProduct.category_name}</Text>
                        </View>
                      )}

                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={18} color="#666" />
                        <Text style={styles.detailLabel}>Created:</Text>
                        <Text style={styles.detailValue}>{formatDate(selectedProduct.created_at)}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Ionicons name="shield-outline" size={18} color="#666" />
                        <Text style={styles.detailLabel}>Status:</Text>
                        <View style={[styles.statusBadgeModal, { backgroundColor: getProductStatusColor(selectedProduct.status) + '15' }]}>
                          <View style={[styles.statusDotModal, { backgroundColor: getProductStatusColor(selectedProduct.status) }]} />
                          <Text style={[styles.statusTextModal, { color: getProductStatusColor(selectedProduct.status) }]}>
                            {selectedProduct.status || 'Active'}
                          </Text>
                        </View>
                      </View>
                    </View>
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
                        <Ionicons name="archive-outline" size={20} color="#fff" />
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
                        <Ionicons name="trash-outline" size={20} color="#fff" />
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
  header: {
    height: 100,
    backgroundColor: '#0A6BFF',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerRefreshButton: {
    padding: 8,
  },
  headerSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0A6BFF',
  },
  statsOverview: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  productImageContainer: {
    width: 110,
    height: 110,
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
  },
  productTypeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  productTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  productInfo: {
    flex: 1,
    padding: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A6BFF',
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#999',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  productDate: {
    fontSize: 10,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  clearSearchButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0A6BFF',
    borderRadius: 10,
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
    gap: 16,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  pageInfoContainer: {
    paddingHorizontal: 16,
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
    maxHeight: height * 0.7,
  },
  actionModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
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
    fontWeight: '700',
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
    fontSize: 15,
    color: '#333',
  },
  clearFilterButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  clearFilterText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  productModalScroll: {
    maxHeight: height * 0.55,
  },
  productModalHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productModalImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  productModalImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  productModalTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 12,
  },
  productModalTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  productModalName: {
    fontSize: 22,
    fontWeight: '700',
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
    marginBottom: 20,
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
  detailCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  statusBadgeModal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusDotModal: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTextModal: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  softDeleteButton: {
    backgroundColor: '#FF9500',
  },
  hardDeleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});