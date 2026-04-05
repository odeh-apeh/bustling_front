// app/(admin)/users.tsx
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
import { SafeAreaView} from 'react-native-safe-area-context';
import { BASE_URL } from '@/helpers/core-service';

const { width } = Dimensions.get('window');
const API_URL = `${BASE_URL}`; // Your server IP

interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: string;
  created_at: string;
  wallet_balance?: number;
  products_count?: number;
  orders_count?: number;
  status?: string;
  is_blocked?: boolean;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function UsersManagementScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const limit = 20;

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      let url = `${API_URL}/api/admin/users?page=${page}&limit=${limit}`;
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }

      console.log('Fetching users from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Users data received:', data);
        
        setUsers(data.users || []);
        setPagination(data.pagination || { total: 0, page, limit, pages: 0 });
      } else if (response.status === 403) {
        router.replace('/auth/account-support');
      } else {
        Alert.alert('Error', 'Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchUsers();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const handleUserAction = (action: 'block' | 'unblock' | 'delete') => {
    if (!selectedUser) return;

    const actionMessages = {
      block: `Block ${selectedUser.name}?`,
      unblock: `Unblock ${selectedUser.name}?`,
      delete: `Delete ${selectedUser.name}? This action cannot be undone.`
    };

    Alert.alert(
      'Confirm Action',
      actionMessages[action],
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: action === 'delete' ? 'destructive' : 'default',
          onPress: () => executeUserAction(action),
        },
      ]
    );
  };

  const executeUserAction = async (action: string) => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(
        `${API_URL}/api/admin/users/${selectedUser.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_blocked: action === 'block',
            status: action === 'block' ? 'inactive' : 'active',
          }),
        }
      );

      if (response.ok) {
        Alert.alert('Success', `User ${action}ed successfully`);
        fetchUsers();
        setModalVisible(false);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
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

  const formatCurrency = (amount: number = 0) => {
    return `₦${amount.toLocaleString()}`;
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => {
        setSelectedUser(item);
        setModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.userAvatar}>
        <Ionicons 
          name="person-circle" 
          size={44} 
          color={item.is_blocked ? '#FF3B30' : '#4A90E2'} 
        />
        {item.is_blocked && (
          <View style={styles.blockedBadge}>
            <Ionicons name="ban" size={12} color="#fff" />
          </View>
        )}
      </View>
      
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[
            styles.statusBadge,
            item.is_blocked ? styles.blockedStatus : styles.activeStatus
          ]}>
            <Text style={styles.statusText}>
              {item.is_blocked ? 'Blocked' : 'Active'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.userPhone} numberOfLines={1}>
          <Ionicons name="call" size={12} color="#666" /> {item.phone}
        </Text>
        
        {item.email && (
          <Text style={styles.userEmail} numberOfLines={1}>
            <Ionicons name="mail" size={12} color="#666" /> {item.email}
          </Text>
        )}
        
        <View style={styles.userStats}>
          <View style={styles.statItem}>
            <Ionicons name="wallet" size={12} color="#4A90E2" />
            <Text style={styles.statText}>
              {formatCurrency(item.wallet_balance)}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="cube" size={12} color="#34C759" />
            <Text style={styles.statText}>
              {item.products_count || 0} products
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="cart" size={12} color="#FF9500" />
            <Text style={styles.statText}>
              {item.orders_count || 0} orders
            </Text>
          </View>
        </View>
        
        <Text style={styles.userJoined}>
          Joined {formatDate(item.created_at)}
        </Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={80} color="#e0e0e0" />
      <Text style={styles.emptyTitle}>No users found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try a different search' : 'No users in the system yet'}
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

  if (loading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A6BFF" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{ 
          title: 'User Management',
          headerStyle: {
            backgroundColor: '#0A6BFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }} 
      />
      
      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name, phone, or email..."
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
          <Text style={styles.statOverviewLabel}>Total Users</Text>
        </View>
        <View style={styles.statOverviewDivider} />
        <View style={styles.statOverviewItem}>
          <Text style={styles.statOverviewValue}>
            {users.filter(u => !u.is_blocked).length}
          </Text>
          <Text style={styles.statOverviewLabel}>Active</Text>
        </View>
        <View style={styles.statOverviewDivider} />
        <View style={styles.statOverviewItem}>
          <Text style={styles.statOverviewValue}>
            {users.filter(u => u.is_blocked).length}
          </Text>
          <Text style={styles.statOverviewLabel}>Blocked</Text>
        </View>
      </View>

      {/* Users List */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContainer}
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
              <Text style={styles.modalTitle}>Filter Users</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.filterLabel}>Status</Text>
            {['all', 'active', 'blocked'].map((filter) => (
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
                  {filter === 'all' ? 'All Users' : 
                   filter === 'active' ? 'Active Only' : 'Blocked Only'}
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => {
                setStatusFilter('all');
                setFilterModalVisible(false);
                setPage(1);
              }}
            >
              <Text style={styles.clearFilterText}>Clear Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* User Action Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => !actionLoading && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Actions</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                disabled={actionLoading}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <>
                <View style={styles.userModalHeader}>
                  <View style={styles.userModalAvatar}>
                    <Ionicons 
                      name="person-circle" 
                      size={60} 
                      color={selectedUser.is_blocked ? '#FF3B30' : '#4A90E2'} 
                    />
                  </View>
                  <Text style={styles.userModalName} numberOfLines={2}>
                    {selectedUser.name}
                  </Text>
                  <Text style={styles.userModalPhone}>{selectedUser.phone}</Text>
                  {selectedUser.email && (
                    <Text style={styles.userModalEmail}>{selectedUser.email}</Text>
                  )}
                  
                  <View style={styles.userModalStats}>
                    <View style={styles.userModalStat}>
                      <Text style={styles.userModalStatValue}>
                        {formatCurrency(selectedUser.wallet_balance)}
                      </Text>
                      <Text style={styles.userModalStatLabel}>Balance</Text>
                    </View>
                    <View style={styles.userModalStat}>
                      <Text style={styles.userModalStatValue}>
                        {selectedUser.products_count || 0}
                      </Text>
                      <Text style={styles.userModalStatLabel}>Products</Text>
                    </View>
                    <View style={styles.userModalStat}>
                      <Text style={styles.userModalStatValue}>
                        {selectedUser.orders_count || 0}
                      </Text>
                      <Text style={styles.userModalStatLabel}>Orders</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  {selectedUser.is_blocked ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.unblockButton]}
                      onPress={() => handleUserAction('unblock')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>Unblock User</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.blockButton]}
                      onPress={() => handleUserAction('block')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="ban" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>Block User</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewDetailsButton]}
                    onPress={() => {
                      setModalVisible(false);
                      // Navigate to user details screen when created
                      // router.push(`/(admin)/users/${selectedUser.id}`);
                    }}
                    disabled={actionLoading}
                  >
                    <Ionicons name="eye" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>View Details</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleUserAction('delete')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="trash" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Delete User</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  userAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  blockedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeStatus: {
    backgroundColor: '#34C75920',
  },
  blockedStatus: {
    backgroundColor: '#FF3B3020',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34C759',
  },
  blockedStatusText: {
    color: '#FF3B30',
  },
  userPhone: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  userStats: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  userJoined: {
    fontSize: 11,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    maxHeight: '50%',
  },
  actionModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  userModalHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  userModalAvatar: {
    marginBottom: 15,
  },
  userModalName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  userModalPhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  userModalEmail: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  userModalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
  },
  userModalStat: {
    alignItems: 'center',
  },
  userModalStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  userModalStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  blockButton: {
    backgroundColor: '#FF3B30',
  },
  unblockButton: {
    backgroundColor: '#34C759',
  },
  viewDetailsButton: {
    backgroundColor: '#4A90E2',
  },
  deleteButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});