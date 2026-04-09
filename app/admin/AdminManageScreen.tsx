import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
  Switch,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from 'expo-haptics';
import { BASE_URL, CoreService } from "@/helpers/core-service";
import { useToast } from "@/contexts/toast-content";
import TwoFactorModal from "@/components/two-factor";

const isIOS = Platform.OS === 'ios';

// Admin type definition
export interface Admin {
  id: number;
  name: string;
  username: string;
  phone: string;
  email: string;
  factor: boolean;
  otp: string;
}

// API Base URL - Replace with your actual API endpoint
const API_BASE_URL = `${BASE_URL}`

export default function AdminManagementScreen() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyTwoFactor, setShowOnlyTwoFactor] = useState(false);
  const service:CoreService = new CoreService();
  const {showToast} = useToast();
  const [currentPassword, setCurrentPassword] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    phone: "",
    email: "",
    factor: false,
    otp: "",
    password: "",
    confirmPassword: "",
    
  });
  const [formLoading, setFormLoading] = useState(false);

  // Fetch admins
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await service.get('/api/admin/fetch-all-admins');
      if(res.success){
      setAdmins(res.data || []);
      }else{
        showToast(res.message,'error');
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
      setAdmins(sampleAdmins);
      showToast( "Failed to load admins. Using sample data.", 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add new admin
  const addAdmin = async () => {
    // Validation
    if (!formData.name || !formData.username || !formData.email || !formData.password) {
      showToast("Please fill all required fields",'error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords do not match",'error');
      return;
    }

    if (formData.password.length < 6) {
      showToast("Password must be at least 6 characters",'error');
      return;
    }

    try {
      setFormLoading(true);
      const payload = {
          name: formData.name,
          username: formData.username,
          phone: formData.phone,
          email: formData.email,
          factor: formData.factor,
          otp: formData.otp || "",
          password: formData.password,
      }
      const res = await service.send('/api/admin/save-admin-details', payload);
      if(res.success){
      const newAdmin = res.data;
      setAdmins([newAdmin, ...admins]);
      closeModal();
      showToast("Admin added successfully");
      if (isIOS) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      }else{
        showToast(res.message,'error');
      }  
    } catch (error) {
      console.error("Error adding admin:", error);
      showToast( "Failed to add admin",'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Update admin
  const updateAdmin = async () => {
    if (!selectedAdmin) return;
    const payload = {
      id: selectedAdmin.id,
      currentPassword: currentPassword, 
      name: formData.name,
          username: formData.username,
          phone: formData.phone,
          email: formData.email,
          factor: formData.factor,
          otp: formData.otp,
          ...(formData.password ? { password: formData.password } : {}),
    }
    try {
      setFormLoading(true);
      
      const res = await service.send('/api/admin/update-admin-details', payload);
      if(res.success){
        const updatedAdmin = res.data;
        setAdmins(admins.map(admin => 
        admin.id === selectedAdmin.id ? updatedAdmin : admin
        ));
      closeModal();
      showToast("Admin updated successfully");
      
      if (isIOS) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      }else{
        console.log(res.message);
        showToast(res.message,'error');
      }

    } catch (error) {
      console.error("Error updating admin:", error);
      showToast("Failed to update admin",'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete admin
  const deleteAdmin = (admin: Admin) => {
    Alert.alert(
      "Delete Admin",
      `Are you sure you want to delete ${admin.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await service.remove('/api/admin/delete-admin',{id:admin.id});
              if(res.success){
                setAdmins(admins.filter(a => a.id !== admin.id));
              showToast( "Admin deleted successfully");
              
              if (isIOS) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              }else{
                showToast(res.message,'error');
              }

              
            } catch (error:any) {
              console.error("Error deleting admin:", error);
              showToast(error.message,'error');
            }
          },
        },
      ]
    );
  };


  // Toggle two-factor authentication
  const toggleTwoFactor = (value: boolean) => {
  setFormData(prev => ({ ...prev, factor: value }));
  if (!value) {
    setFormData(prev => ({ ...prev, otp: "" }));
  }
};

  

  // Open modal for add/edit
  const openModal = (admin?: Admin) => {
    if (admin) {
      setSelectedAdmin(admin);
      setFormData({
        name: admin.name,
        username: admin.username,
        phone: admin.phone,
        email: admin.email,
        factor: admin.factor,
        otp: admin.otp,
        password: "",
        confirmPassword: "",
      });
    } else {
      setSelectedAdmin(null);
      setFormData({
        name: "",
        username: "",
        phone: "",
        email: "",
        factor: false,
        otp: "",
        password: "",
        confirmPassword: "",
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedAdmin(null);
    setFormData({
      name: "",
      username: "",
      phone: "",
      email: "",
      factor: false,
      otp: "",
      password: "",
      confirmPassword: "",
    });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAdmins().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Filter admins based on search and two-factor
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         admin.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         admin.phone.includes(searchQuery);
    const matchesTwoFactor = showOnlyTwoFactor ? admin.factor === true : true;
    return matchesSearch && matchesTwoFactor;
  });

  const renderAdminCard = ({ item }: { item: Admin }) => (
    <TouchableOpacity
      style={styles.adminCard}
      onPress={() => openModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.adminName}>{item.name}</Text>
          <Text style={styles.adminUsername}>@{item.username}</Text>
        </View>
        {item.factor && (
          <View style={styles.twoFactorBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
          </View>
        )}
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.email}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.phone || "Not provided"}</Text>
        </View>
        {item.factor && item.otp && (
          <View style={styles.detailRow}>
            <Ionicons name="key-outline" size={16} color="#FF9800" />
            <Text style={styles.otpText}>OTP: {item.otp}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openModal(item)}
        >
          <Ionicons name="create-outline" size={18} color="#007AFF" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteAdmin(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
          statusBarStyle: 'dark',
          statusBarBackgroundColor: '#fff',
        }}
      />


      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, showOnlyTwoFactor && styles.filterButtonActive]}
          onPress={() => setShowOnlyTwoFactor(!showOnlyTwoFactor)}
        >
          <Ionicons
            name="shield-half"
            size={20}
            color={showOnlyTwoFactor ? "#fff" : "#007AFF"}
          />
          <Text style={[styles.filterText, showOnlyTwoFactor && styles.filterTextActive]}>
            2FA Enabled
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{admins.length}</Text>
          <Text style={styles.statLabel}>Total Admins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{admins.filter(a => a.factor).length}</Text>
          <Text style={styles.statLabel}>2FA Enabled</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{admins.filter(a => !a.factor).length}</Text>
          <Text style={styles.statLabel}>2FA Disabled</Text>
        </View>
      </View>

      {/* Admin List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading admins...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAdmins}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAdminCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No admins found</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => openModal()}>
                <Text style={styles.emptyButtonText}>Add your first admin</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add/Edit Admin Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <BlurView intensity={isIOS ? 90 : 100} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedAdmin ? "Edit Admin" : "Add New Admin"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter full name"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter username"
                    value={formData.username}
                    onChangeText={(text) => setFormData({ ...formData, username: text })}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email address"
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.switchContainer}>
                  <View style={styles.switchLabelContainer}>
                    <Ionicons name="shield" size={20} color="#007AFF" />
                    <Text style={styles.switchLabel}>Two-Factor Authentication (2FA)</Text>
                  </View>
                  <Switch
                    value={formData.factor}
                    onValueChange={toggleTwoFactor}
                    trackColor={{ false: "#e0e0e0", true: "#007AFF" }}
                    thumbColor={isIOS ? "#fff" : formData.factor ? "#fff" : "#f4f3f4"}
                  />
                </View>

                
                  <View style={styles.otpContainer}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Current Password</Text>
                      <TextInput
                        style={[styles.input, styles.otpInput]}
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChangeText={(text) => setCurrentPassword(text)}
                        secureTextEntry
                      />
                    </View>
                    {/* <TouchableOpacity style={styles.generateButton} onPress={generateOTP}>
                      <Ionicons name="refresh" size={20} color="#007AFF" />
                      <Text style={styles.generateButtonText}>Generate New OTP</Text>
                    </TouchableOpacity> */}
                  </View>
                

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {selectedAdmin ? "New Password (optional)" : "Password *"}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={selectedAdmin ? "Enter new password (optional)" : "Enter password"}
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    secureTextEntry
                  />
                </View>

                {(formData.password || !selectedAdmin) && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                      secureTextEntry
                    />
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={selectedAdmin ? updateAdmin : addAdmin}
                disabled={formLoading}
              >
                {formLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {selectedAdmin ? "Update" : "Add"} Admin
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

// Sample data for demonstration
const sampleAdmins: Admin[] = [
  {
    id: 1,
    name: "John Doe",
    username: "johndoe",
    phone: "+1234567890",
    email: "john@example.com",
    factor: true,
    otp: "123456",
  },
  {
    id: 2,
    name: "Jane Smith",
    username: "janesmith",
    phone: "+1987654321",
    email: "jane@example.com",
    factor: false,
    otp: "",
  },
  {
    id: 3,
    name: "Mike Johnson",
    username: "mikej",
    phone: "+1122334455",
    email: "mike@example.com",
    factor: true,
    otp: "654321",
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  addButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
    flexDirection: "row",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#007AFF",
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: "#007AFF",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#007AFF",
  },
  filterTextActive: {
    color: "#fff",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  adminCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  cardInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  adminUsername: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  twoFactorBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#666",
  },
  otpText: {
    fontSize: 13,
    color: "#FF9800",
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF3B30",
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF3B30",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    minHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    marginBottom: 16,
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  otpContainer: {
    marginBottom: 16,
  },
  otpInput: {
    fontFamily: isIOS ? "Courier" : "monospace",
    fontSize: 14,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    marginTop: 8,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});