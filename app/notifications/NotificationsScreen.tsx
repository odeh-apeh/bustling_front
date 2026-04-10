import React, { useState, useEffect, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL, CoreService } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { height, width } = Dimensions.get("window");
const isIOS = Platform.OS === 'ios';

export type Notification = {
  id: number;
  user_id: number;
  message: string;
  is_read: number; // 0 = unread, 1 = read
  created_at: string;
  type?: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { showToast } = useToast();
  const service: CoreService = new CoreService();
  const [userId, setUserId] = useState<number | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchUserId();
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  const fetchUserId = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (userId) {
        setUserId(parseInt(userId));
      }
    } catch (e: any) {
      showToast("Unable to get user info", 'error');
    }
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await service.send('/api/notifications/get-notifications', { userId: userId });
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data || []);
      } else {
        Alert.alert("Error", res.message || "Failed to load notifications");
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert("Error", "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, is_read: 1 } : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const showNotificationModal = (notification: Notification) => {
    setSelectedNotification(notification);
    setModalVisible(true);
    
    // Animate modal entrance
    modalScale.setValue(0.9);
    modalOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 200,
        bounciness: 10,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Mark as read when opened
    if (notification.is_read === 0) {
      markAsRead(notification.id);
    }
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(modalScale, {
        toValue: 0.9,
        useNativeDriver: true,
        speed: 200,
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedNotification(null);
    });
  };

  const handleNotificationPress = (notification: Notification) => {
    showNotificationModal(notification);
  };

  const getNotificationIcon = (message: string) => {
    if (message.includes('delivery') || message.includes('Delivery')) {
      return "car-outline";
    } else if (message.includes('order') || message.includes('Order')) {
      return "cube-outline";
    } else if (message.includes('sold') || message.includes('Sold')) {
      return "bag-check-outline";
    } else if (message.includes('payment') || message.includes('Payment')) {
      return "wallet-outline";
    }
    return "notifications-outline";
  };

  const getNotificationColor = (message: string) => {
    if (message.includes('delivery') || message.includes('Delivery')) {
      return "#185FA5";
    } else if (message.includes('success') || message.includes('Success') || message.includes('sold')) {
      return "#4CAF50";
    } else if (message.includes('error') || message.includes('Error') || message.includes('failed')) {
      return "#E24B4A";
    }
    return "#EF9F27";
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false, statusBarStyle: 'light' }} />
        <LinearGradient
          colors={['#185FA5', '#0F4A7A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View  style={{
            display:'flex',
            flexDirection:'row',
            justifyContent:'center',
            alignItems:'center',
            gap:20
          }}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
            </View>
            
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#185FA5" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unreadCount = notifications.filter(notif => notif.is_read === 0).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false, statusBarStyle: 'light' }} />

      {/* Header with Gradient */}
      <LinearGradient
        colors={['#185FA5', '#0F4A7A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={{
            display:'flex',
            flexDirection:'row',
            justifyContent:'center',
            alignItems:'center',
            gap:20
          }}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </Text>
          <TouchableOpacity onPress={() => {}}>
            {/* <Ionicons name="settings-outline" size={20} color="#fff" /> */}
          </TouchableOpacity>
          </View>
          
        </View>
      </LinearGradient>

      {/* Content Sheet */}
      <View style={styles.contentSheet}>
        <View style={styles.dragPill} />

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={["#185FA5"]}
              tintColor="#185FA5"
            />
          }
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Notifications List */}
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyStateTitle}>No Notifications</Text>
                <Text style={styles.emptyStateText}>
                  You don&apos;t have any notifications yet. They will appear here for orders, deliveries, and other activities.
                </Text>
              </View>
            ) : (
              notifications.map((notification, index) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    notification.is_read === 0 && styles.unreadNotification
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.7}
                >
                  <View style={styles.notificationIconContainer}>
                    <LinearGradient
                      colors={[getNotificationColor(notification.message), getNotificationColor(notification.message) + 'CC']}
                      style={styles.notificationIconGradient}
                    >
                      <Ionicons 
                        name={getNotificationIcon(notification.message)} 
                        size={22} 
                        color="#fff" 
                      />
                    </LinearGradient>
                  </View>
                  
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatTime(notification.created_at)}
                    </Text>
                  </View>

                  {notification.is_read === 0 && (
                    <View style={styles.unreadDot} />
                  )}
                  
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              ))
            )}

            <View style={styles.bottomPadding} />
          </Animated.View>
        </ScrollView>
      </View>

      {/* Notification Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeModal} />
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
              }
            ]}
          >
            {selectedNotification && (
              <>
                <LinearGradient
                  colors={[getNotificationColor(selectedNotification.message), getNotificationColor(selectedNotification.message) + 'CC']}
                  style={styles.modalHeaderGradient}
                >
                  <View style={styles.modalIconCircle}>
                    <Ionicons 
                      name={getNotificationIcon(selectedNotification.message)} 
                      size={40} 
                      color="#fff" 
                    />
                  </View>
                </LinearGradient>
                
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Notification Details</Text>
                  <Text style={styles.modalMessage}>
                    {selectedNotification.message}
                  </Text>
                  
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                    <Text style={styles.modalInfoText}>
                      {formatTime(selectedNotification.created_at)}
                    </Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                    <Text style={styles.modalInfoText}>
                      {new Date(selectedNotification.created_at).toLocaleString()}
                    </Text>
                  </View>
                  
                  <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
                    <LinearGradient
                      colors={['#185FA5', '#0F4A7A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.modalCloseGradient}
                    >
                      <Text style={styles.modalCloseText}>Close</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1923',
  },
  
  // Header Gradient
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom:8
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: '#fff',
  },
  placeholder: {
    width: 38,
  },
  
  // Content Sheet
  contentSheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 6,
  },
  dragPill: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6B7280",
  },
  
  // Notification Card
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  unreadNotification: {
    backgroundColor: "#E6F1FB",
    borderColor: "#185FA5",
  },
  notificationIconContainer: {
    marginRight: 14,
  },
  notificationIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: "#6B7280",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#185FA5",
    marginHorizontal: 8,
  },
  
  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 30,
  },
  
  bottomPadding: {
    height: 40,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: width - 48,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeaderGradient: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalInfoText: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalCloseButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  modalCloseGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});