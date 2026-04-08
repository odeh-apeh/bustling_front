// app/(admin)/orders.tsx
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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '@/helpers/core-service';

const { width, height } = Dimensions.get('window');
const API_URL = `${BASE_URL}`;

interface Order {
  id: number;
  buyer_id: number;
  buyer_name: string;
  buyer_phone: string;
  seller_id: number;
  seller_name: string;
  seller_phone: string;
  product_id: number;
  product_title: string;
  product_type: string;
  product_price: number;
  product_location?: string;
  quantity: number;
  total: number;
  delivery_fee: number;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  delivery_status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  shipping_address?: string;
  delivery_notes?: string;
  notes?: string;
  type: 'product' | 'service';
  created_at: string;
  updated_at: string;
  delivery_company_id?: number;
  service_id?: number;
  order_number?: string; // Added this field
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function OrdersManagementScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all'); // Changed from disputeFilter

  const limit = 20;

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, paymentFilter]);

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      let url = `${API_URL}/api/admin/orders?page=${page}&limit=${limit}`;
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (paymentFilter !== 'all') {
        url += `&payment_status=${paymentFilter}`;
      }

      console.log('Fetching orders from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Orders data received:', data);
        
        setOrders(data.orders || []);
        setPagination(data.pagination || { total: 0, page, limit, pages: 0 });
      } else if (response.status === 403) {
        router.replace('/auth/account-support');
      } else {
        Alert.alert('Error', 'Failed to load orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchOrders();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
    const timeoutId = setTimeout(() => {
      fetchOrders();
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const handleUpdateOrder = async (orderId: number, newStatus: string) => {
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(
        `${API_URL}/api/admin/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', data.message || 'Order updated successfully');
        fetchOrders();
        setModalVisible(false);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getOrderStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#FF9500';
      case 'paid': return '#007AFF';
      case 'shipped': return '#5856D6';
      case 'completed': return '#34C759';
      case 'cancelled': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getOrderStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'paid': return 'Paid';
      case 'shipped': return 'Shipped';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#FF9500';
      case 'paid': return '#34C759';
      case 'failed': return '#FF3B30';
      case 'refunded': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getProductTypeIcon = (type: string) => {
    return type === 'service' ? 'construct' : 'cube';
  };

  const getProductTypeColor = (type: string) => {
    return type === 'service' ? '#5856D6' : '#34C759';
  };

  const getNextStatusOptions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return ['paid', 'cancelled'];
      case 'paid':
        return ['shipped', 'cancelled'];
      case 'shipped':
        return ['completed', 'cancelled'];
      default:
        return [];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'paid': return 'checkmark-circle-outline';
      case 'shipped': return 'car-outline';
      case 'completed': return 'trophy-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity 
      style={styles.orderItem}
      onPress={() => {
        setSelectedOrder(item);
        setModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      {/* Order Header */}
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderIdText}>Order #{item.id}</Text>
          <View style={styles.orderTypeBadge}>
            <Ionicons 
              name={getProductTypeIcon(item.product_type)} 
              size={12} 
              color={getProductTypeColor(item.product_type)} 
            />
            <Text style={[styles.orderTypeText, { color: getProductTypeColor(item.product_type) }]}>
              {item.product_type}
            </Text>
          </View>
        </View>
        <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
      </View>

      {/* Order Details */}
      <View style={styles.orderDetails}>
        <Text style={styles.productTitle} numberOfLines={1}>
          {item.product_title}
        </Text>
        
        <View style={styles.orderInfoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="person" size={12} color="#666" />
            <Text style={styles.infoLabel}>Buyer: </Text>
            <Text style={styles.infoValue}>{item.buyer_name}</Text>
          </View>
          <Text style={styles.infoPhone}>{item.buyer_phone}</Text>
        </View>

        <View style={styles.orderInfoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="business" size={12} color="#666" />
            <Text style={styles.infoLabel}>Seller: </Text>
            <Text style={styles.infoValue}>{item.seller_name}</Text>
          </View>
          <Text style={styles.infoPhone}>{item.seller_phone}</Text>
        </View>

        <View style={styles.orderInfoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="cash" size={12} color="#666" />
            <Text style={styles.infoLabel}>Amount: </Text>
            <Text style={styles.amountValue}>{formatCurrency(item.total)}</Text>
          </View>
          <Text style={styles.quantityText}>Qty: {item.quantity}</Text>
        </View>

        {item.shipping_address && (
          <View style={styles.orderInfoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={12} color="#666" />
              <Text style={styles.infoLabel}>Address: </Text>
              <Text style={styles.infoValue} numberOfLines={1}>{item.shipping_address}</Text>
            </View>
          </View>
        )}

        {/* Order Status and Actions */}
        <View style={styles.orderFooter}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getOrderStatusColor(item.status) + '20' }]}>
              <Ionicons 
                name={getStatusIcon(item.status)} 
                size={14} 
                color={getOrderStatusColor(item.status)} 
              />
              <Text style={[styles.statusText, { color: getOrderStatusColor(item.status) }]}>
                {getOrderStatusText(item.status)}
              </Text>
            </View>
            
            <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(item.payment_status) + '20' }]}>
              <Ionicons 
                name="card" 
                size={12} 
                color={getPaymentStatusColor(item.payment_status)} 
              />
              <Text style={[styles.paymentText, { color: getPaymentStatusColor(item.payment_status) }]}>
                {item.payment_status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color="#e0e0e0" />
      <Text style={styles.emptyTitle}>No orders found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try a different search' : 'No orders placed yet'}
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

  if (loading && orders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A6BFF" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Stack.Screen
          options={{
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
                  Order Management
                </Text>
              </View>
            ),
          }}
        />
        
        {/* Fixed Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search orders..."
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
                {orders.filter(o => o.status === 'completed').length}
              </Text>
              <Text style={styles.statOverviewLabel}>Completed</Text>
            </View>
            <View style={styles.statOverviewDivider} />
            <View style={styles.statOverviewItem}>
              <Text style={styles.statOverviewValue}>
                {orders.filter(o => o.payment_status === 'paid').length}
              </Text>
              <Text style={styles.statOverviewLabel}>Paid</Text>
            </View>
          </View>
        </View>

        {/* Scrollable Orders List */}
        <View style={{ flex: 1 }}>
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderOrderItem}
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
                <Text style={styles.modalTitle}>Filter Orders</Text>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.filterLabel}>Order Status</Text>
              {['all', 'pending', 'paid', 'shipped', 'completed', 'cancelled'].map((filter) => (
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
                     filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
              
              <Text style={[styles.filterLabel, { marginTop: 20 }]}>Payment Status</Text>
              {['all', 'pending', 'paid', 'failed', 'refunded'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={styles.filterOption}
                  onPress={() => {
                    setPaymentFilter(filter);
                    setFilterModalVisible(false);
                    setPage(1);
                  }}
                >
                  <View style={styles.filterRadio}>
                    {paymentFilter === filter && (
                      <View style={styles.filterRadioSelected} />
                    )}
                  </View>
                  <Text style={styles.filterOptionText}>
                    {filter === 'all' ? 'All Payments' : 
                     filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => {
                  setStatusFilter('all');
                  setPaymentFilter('all');
                  setFilterModalVisible(false);
                  setPage(1);
                }}
              >
                <Text style={styles.clearFilterText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Order Action Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => !actionLoading && setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.actionModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Order Details</Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  disabled={actionLoading}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {selectedOrder && (
                <>
                  <ScrollView 
                    style={styles.orderModalScroll}
                    showsVerticalScrollIndicator={true}
                  >
                    <View style={styles.orderModalHeader}>
                      <View style={styles.orderModalId}>
                        <Text style={styles.orderModalIdText}>Order #{selectedOrder.id}</Text>
                        <View style={styles.orderModalTypeBadge}>
                          <Ionicons 
                            name={getProductTypeIcon(selectedOrder.product_type)} 
                            size={14} 
                            color={getProductTypeColor(selectedOrder.product_type)} 
                          />
                          <Text style={[styles.orderModalTypeText, { color: getProductTypeColor(selectedOrder.product_type) }]}>
                            {selectedOrder.product_type.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.orderModalDate}>{formatDate(selectedOrder.created_at)}</Text>
                      
                      <Text style={styles.orderModalProduct}>{selectedOrder.product_title}</Text>
                      
                      <View style={styles.orderModalAmountContainer}>
                        <Text style={styles.orderModalAmount}>{formatCurrency(selectedOrder.total)}</Text>
                        <Text style={styles.orderModalQuantity}>× {selectedOrder.quantity}</Text>
                      </View>
                      
                      <View style={styles.orderModalStatusContainer}>
                        <View style={[styles.orderModalStatusBadge, { backgroundColor: getOrderStatusColor(selectedOrder.status) + '20' }]}>
                          <Ionicons 
                            name={getStatusIcon(selectedOrder.status)} 
                            size={18} 
                            color={getOrderStatusColor(selectedOrder.status)} 
                          />
                          <Text style={[styles.orderModalStatusText, { color: getOrderStatusColor(selectedOrder.status) }]}>
                            {getOrderStatusText(selectedOrder.status)}
                          </Text>
                        </View>
                        
                        <View style={[styles.orderModalPaymentBadge, { backgroundColor: getPaymentStatusColor(selectedOrder.payment_status) + '20' }]}>
                          <Ionicons 
                            name="card" 
                            size={16} 
                            color={getPaymentStatusColor(selectedOrder.payment_status)} 
                          />
                          <Text style={[styles.orderModalPaymentText, { color: getPaymentStatusColor(selectedOrder.payment_status) }]}>
                            PAYMENT: {selectedOrder.payment_status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.orderModalDetails}>
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Customer Information</Text>
                        <View style={styles.detailRow}>
                          <View style={styles.detailItem}>
                            <Ionicons name="person" size={16} color="#666" />
                            <Text style={styles.detailLabel}>Buyer:</Text>
                            <Text style={styles.detailValue}>{selectedOrder.buyer_name}</Text>
                          </View>
                          <Text style={styles.detailPhone}>{selectedOrder.buyer_phone}</Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                          <View style={styles.detailItem}>
                            <Ionicons name="business" size={16} color="#666" />
                            <Text style={styles.detailLabel}>Seller:</Text>
                            <Text style={styles.detailValue}>{selectedOrder.seller_name}</Text>
                          </View>
                          <Text style={styles.detailPhone}>{selectedOrder.seller_phone}</Text>
                        </View>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Order Information</Text>
                        <View style={styles.detailRow}>
                          <View style={styles.detailItem}>
                            <Ionicons name="cash" size={16} color="#666" />
                            <Text style={styles.detailLabel}>Payment Method:</Text>
                            <Text style={styles.detailValue}>{selectedOrder.payment_method || 'Not specified'}</Text>
                          </View>
                        </View>
                        
                        {selectedOrder.shipping_address && (
                          <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                              <Ionicons name="location" size={16} color="#666" />
                              <Text style={styles.detailLabel}>Shipping Address:</Text>
                              <Text style={styles.detailValue}>{selectedOrder.shipping_address}</Text>
                            </View>
                          </View>
                        )}
                        
                        <View style={styles.detailRow}>
                          <View style={styles.detailItem}>
                            <Ionicons name="car" size={16} color="#666" />
                            <Text style={styles.detailLabel}>Delivery Status:</Text>
                            <Text style={styles.detailValue}>
                              {selectedOrder.delivery_status.replace('_', ' ').toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        
                        {selectedOrder.notes && (
                          <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                              <Ionicons name="document-text" size={16} color="#666" />
                              <Text style={styles.detailLabel}>Notes:</Text>
                              <Text style={styles.detailValue}>{selectedOrder.notes}</Text>
                            </View>
                          </View>
                        )}

                        {selectedOrder.delivery_notes && (
                          <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                              <Ionicons name="clipboard" size={16} color="#666" />
                              <Text style={styles.detailLabel}>Delivery Notes:</Text>
                              <Text style={styles.detailValue}>{selectedOrder.delivery_notes}</Text>
                            </View>
                          </View>
                        )}
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Timeline</Text>
                        <View style={styles.detailRow}>
                          <View style={styles.detailItem}>
                            <Ionicons name="calendar" size={16} color="#666" />
                            <Text style={styles.detailLabel}>Created:</Text>
                            <Text style={styles.detailValue}>{formatDate(selectedOrder.created_at)}</Text>
                          </View>
                        </View>
                        
                        {selectedOrder.updated_at && (
                          <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                              <Ionicons name="time" size={16} color="#666" />
                              <Text style={styles.detailLabel}>Updated:</Text>
                              <Text style={styles.detailValue}>{formatDate(selectedOrder.updated_at)}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </ScrollView>

                  {/* Status Update Actions */}
                  <View style={styles.actionButtons}>
                    <Text style={styles.actionTitle}>Update Order Status</Text>
                    <View style={styles.statusButtons}>
                      {getNextStatusOptions(selectedOrder.status).map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[styles.statusButton, { backgroundColor: getOrderStatusColor(status) }]}
                          onPress={() => {
                            Alert.alert(
                              'Confirm Update',
                              `Change order status to ${status}?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Update',
                                  onPress: () => handleUpdateOrder(selectedOrder.id, status),
                                },
                              ]
                            );
                          }}
                          disabled={actionLoading}
                        >
                          {actionLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Ionicons name={getStatusIcon(status)} size={18} color="#fff" />
                              <Text style={styles.statusButtonText}>
                                {getOrderStatusText(status)}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
    flexGrow: 1,
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
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statOverviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  statOverviewValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statOverviewLabel: {
    fontSize: 12,
    color: '#666',
  },
  statOverviewDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  orderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  orderTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  orderDetails: {
    gap: 6,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 2,
  },
  infoValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  infoPhone: {
    fontSize: 12,
    color: '#0A6BFF',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A6BFF',
  },
  quantityText: {
    fontSize: 12,
    color: '#666',
  },
  orderFooter: {
    marginTop: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  paymentText: {
    fontSize: 9,
    fontWeight: '600',
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
  orderModalScroll: {
    maxHeight: height * 0.7,
  },
  orderModalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  orderModalId: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderModalIdText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  orderModalTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  orderModalTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderModalDate: {
    fontSize: 13,
    color: '#999',
  },
  orderModalProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderModalAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderModalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0A6BFF',
  },
  orderModalQuantity: {
    fontSize: 14,
    color: '#666',
  },
  orderModalStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderModalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  orderModalStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  orderModalPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  orderModalPaymentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderModalDetails: {
    padding: 20,
    gap: 20,
  },
  detailSection: {
    gap: 12,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    minWidth: 80,
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
  actionButtons: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
    gap: 8,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});