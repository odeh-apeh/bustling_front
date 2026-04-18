import { useToast } from "@/contexts/toast-content";
import { BASE_URL, CoreService } from "@/helpers/core-service";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const isIOS = Platform.OS === "ios";

type DeliveryAgent = {
  id: string;
  company_name: string;
  coverage_area: string[] | string;
  vehicle_type?: string;
  description?: string;
  status?: "active" | "inactive" | "pending" | "suspended";
  user_id: string;
  phone_number?: string;
  location?: string;
  state?: string;
  local_government?: string;
  delivery_types?: string[]
  rating?: number;
  total_deliveries?: number;
  created_at?: string;
  full_name?: string;
};

type EditAgentForm = {
  company_name: string;
  coverage_area: string;
  vehicle_type: string;
  description: string;
  phone_number: string;
  location: string;
  state: string;
  local_government: string;
  delivery_type: string;
};

export default function ManageDeliveryAgentScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<DeliveryAgent | null>(
    null,
  );
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const service: CoreService = new CoreService();

  const params = useLocalSearchParams();
  const getValidUserId = () => {
  const id = Number(params?.userId);
  return isNaN(id) ? null : id;
};

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const userId = getValidUserId();

        if (userId) {
          // Edit mode
          await fetchCompanyById({
            userId: Number(userId),
            companyName: String(params?.companyName),
          });
        } else {
          // Create mode
          await fetchDeliveryCompanies();
        }
      };

      loadData();
    }, [params?.userId, params?.companyName]),
  );

  const reloadData = async () => {
  const userId = getValidUserId();

  if (userId) {
    await fetchCompanyById({
      userId,
      companyName: String(params?.companyName),
    });
  } else {
    await fetchDeliveryCompanies();
  }
};

  // Edit form state
  const [editForm, setEditForm] = useState<EditAgentForm>({
    company_name: "",
    coverage_area: "",
    vehicle_type: "",
    description: "",
    phone_number: "",
    location: "",
    state: "",
    local_government: "",
    delivery_type: "intrastate",
  });

  // Fetch delivery companies
  const fetchDeliveryCompanies = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching delivery companies...");

      const response = await fetch(`${BASE_URL}/api/delivery/companies`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      console.log(
        "📦 Delivery companies API response:",
        JSON.stringify(data, null, 2),
      );

      if (data.success && data.companies) {
        const transformedAgents = data.companies.map((agent: any) => {
          let coverageArea = agent.coverage_area || [];
          if (typeof coverageArea === "string") {
            try {
              coverageArea = JSON.parse(coverageArea);
            } catch (e) {
              coverageArea = [agent.coverage_area];
            }
          }

          let location = "Location not specified";
          if (agent.local_government && agent.state) {
            location = `${agent.local_government}, ${agent.state}`;
          } else if (agent.local_government) {
            location = agent.local_government;
          } else if (agent.state) {
            location = agent.state;
          } else if (agent.location) {
            location = agent.location;
          }

          return {
            id: agent.id?.toString(),
            company_name: agent.company_name || "Delivery Company",
            coverage_area: coverageArea,
            location: location,
            state: agent.state || "",
            local_government: agent.local_government || "",
            phone_number: agent.phone_number || "Not provided",
            vehicle_type: agent.vehicle_type || "Not specified",
            description: agent.description || "",
            status: agent.status || "active",
            user_id: agent.user_id,
            delivery_types:
              agent.delivery_types || [],
            full_name: agent.full_name,
            created_at: agent.created_at,
          };
        });

        console.log("✅ Transformed agents:", transformedAgents.length);
        setAgents(transformedAgents);
      } else {
        console.error("❌ API error:", data.message);
        showToast(data.message || "Failed to load delivery companies", "error");
      }
    } catch (error) {
      console.error("❌ Error fetching delivery companies:", error);
      showToast(
        "Failed to load delivery companies. Please check your connection.",
        "error",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCompanyById = async ({
    userId,
    companyName,
  }: {
    userId: number;
    companyName: string;
  }) => {
    setLoading(true);
    const payload = {
      userId: userId,
      companyName: companyName,
    };
    try {
      const res = await service.send(
        "/api/delivery/get-company-by-id",
        payload,
      );
      if (res.success && res.data) {
        const transformedAgents = res.data.map((agent: any) => {
          let coverageArea = agent.coverage_area || [];
          if (typeof coverageArea === "string") {
            try {
              coverageArea = JSON.parse(coverageArea);
            } catch (e) {
              coverageArea = [agent.coverage_area];
            }
          }

          let location = "Location not specified";
          if (agent.local_government && agent.state) {
            location = `${agent.local_government}, ${agent.state}`;
          } else if (agent.local_government) {
            location = agent.local_government;
          } else if (agent.state) {
            location = agent.state;
          } else if (agent.location) {
            location = agent.location;
          }

          return {
            id: agent.id?.toString(),
            company_name: agent.company_name || "Delivery Company",
            coverage_area: coverageArea,
            location: location,
            state: agent.state || "",
            local_government: agent.local_government || "",
            phone_number: agent.phone_number || "Not provided",
            vehicle_type: agent.vehicle_type || "Not specified",
            description: agent.description || "",
            status: agent.status || "active",
            user_id: agent.user_id,
            delivery_types:
              agent.delivery_types || [],
            full_name: agent.full_name,
            created_at: agent.created_at,
          };
        });

        console.log("✅ Transformed agents:", transformedAgents.length);
        setAgents(transformedAgents);
        setLoading(false);
      } else {
        showToast(res.message, "error");
        setLoading(false);
      }
    } catch (e: any) {
      showToast(e.message, "error");
      setLoading(false);
    }
  };

  // Update delivery agent
  const updateAgent = async () => {
    if (!selectedAgent) return;

    setUpdating(true);
    try {
      let coverageAreaArray: string[] = [];
      if (editForm.coverage_area) {
        if (editForm.coverage_area.includes(",")) {
          coverageAreaArray = editForm.coverage_area
            .split(",")
            .map((item) => item.trim());
        } else {
          coverageAreaArray = [editForm.coverage_area];
        }
      }

      const updateData = {
        companyName: editForm.company_name,
        fullName: editForm.company_name,
        description: editForm.description,
        phoneNumber: editForm.phone_number,
        state: editForm.state,
        localGovernment: editForm.local_government,
        coverageArea: coverageAreaArray,
        vehicleType: editForm.vehicle_type,
        deliveryTypes: [editForm.delivery_type],
      };

      const response = await fetch(
        `${BASE_URL}/api/delivery-company/delivery/company/${selectedAgent.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(updateData),
        },
      );

      const data = await response.json();

      if (data.success) {
        showToast("Profile updated successfully!", "success");
        setEditModalVisible(false);
        reloadData();
      } else {
        showToast(data.message || "Failed to update profile", "error");
        console.log(data.message);
      }
    } catch (error: any) {
      console.error("Error updating agent:", error);
      showToast("Network error. Please try again.", "error");
    } finally {
      setUpdating(false);
    }
  };

  // Delete delivery agent
  const deleteAgent = async () => {
    if (!selectedAgent) return;

    setUpdating(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api/delivery-company/delivery/company/${selectedAgent.id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        showToast("Delivery company deleted successfully!", "success");
        setDeleteConfirmVisible(false);
        setSelectedAgent(null);
        reloadData();
      } else {
        showToast(data.message || "Failed to delete company", "error");
      }
    } catch (error: any) {
      console.error("Error deleting agent:", error);
      showToast("Network error. Please try again.", "error");
    } finally {
      setUpdating(false);
    }
  };

  // Toggle agent status
  const toggleAgentStatus = async (agent: DeliveryAgent) => {
    const newStatus = agent.status === "active" ? "inactive" : "active";

    try {
      const response = await fetch(
        `${BASE_URL}/api/delivery-company/delivery/company/update-status/${agent.id}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      const data = await response.json();

      if (data.success) {
        showToast(
          `Company ${newStatus === "active" ? "activated" : "deactivated"}!`,
          "success",
        );
        reloadData();
      } else {
        showToast(data.message || "Failed to update status", "error");
      }
    } catch (error: any) {
      console.error("Error toggling status:", error);
      showToast("Network error. Please try again.", "error");
    }
  };

  // Open edit modal
  const openEditModal = (agent: DeliveryAgent) => {
    let coverageAreaString = "";
    if (agent.coverage_area) {
      if (Array.isArray(agent.coverage_area)) {
        coverageAreaString = agent.coverage_area.join(", ");
      } else if (typeof agent.coverage_area === "string") {
        coverageAreaString = agent.coverage_area;
      }
    }

    setSelectedAgent(agent);
    setEditForm({
      company_name: agent.company_name || "",
      coverage_area: coverageAreaString,
      vehicle_type: agent.vehicle_type || "",
      description: agent.description || "",
      phone_number: agent.phone_number || "",
      location: agent.location || "",
      state: agent.state || "",
      local_government: agent.local_government || "",
      delivery_type: agent.delivery_types?.[0] ?? "intrastate"
    });
    setEditModalVisible(true);
  };

  // Open delete confirmation
  const openDeleteConfirm = (agent: DeliveryAgent) => {
    setSelectedAgent(agent);
    setDeleteConfirmVisible(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveryCompanies();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "#10B981";
      case "inactive":
        return "#F59E0B";
      case "pending":
        return "#3B82F6";
      case "suspended":
        return "#EF4444";
      default:
        return "#9CA3AF";
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      case "pending":
        return "Pending Approval";
      case "suspended":
        return "Suspended";
      default:
        return "Unknown";
    }
  };

  const getDeliveryTypeText = (type?: string[]) => {
  if (!type || !Array.isArray(type)) return "Not specified";

  if (type.includes("intrastate")) {
    return "Intrastate (Within State)";
  }

  if (type.includes("interstate")) {
    return "Interstate (Between States)";
  }

  if (type.includes("national")) {
    return "National (Across Country)";
  }

  return "Not specified";
};

  const formatCoverageArea = (coverageArea: string[] | string) => {
    if (
      !coverageArea ||
      (typeof coverageArea === "object" && !Array.isArray(coverageArea))
    )
      return "Not specified";
    if (Array.isArray(coverageArea)) {
      return coverageArea.join(", ");
    }
    return coverageArea;
  };

  const renderAgentCard = ({ item }: { item: DeliveryAgent }) => (
    <View style={styles.agentCard}>
      <LinearGradient
        colors={["#FFFFFF", "#F9FAFB"]}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <FontAwesome5 name="truck" size={28} color="#0066CC" />
            </View>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.companyName}>{item.company_name}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) + "15" },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(item.status) },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(item.status) },
                ]}
              >
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.phone_number}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>Vehicle: {item.vehicle_type}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="map" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              Type: {getDeliveryTypeText(item.delivery_types)}
            </Text>
          </View>
          <View style={styles.detailRow}> 
            <Ionicons name="map-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              Area: {formatCoverageArea(item.coverage_area)}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={16} color="#0066CC" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.statusActionBtn]}
            onPress={() => toggleAgentStatus(item)}
          >
            <Ionicons
              name={
                item.status === "active"
                  ? "pause-circle-outline"
                  : "play-circle-outline"
              }
              size={16}
              color={getStatusColor(item.status)}
            />
            <Text
              style={[
                styles.statusActionText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status === "active" ? "Deactivate" : "Activate"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => openDeleteConfirm(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading delivery companies...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }}></Stack.Screen>
      <StatusBar backgroundColor={"#5a9eff"}></StatusBar>
      {/* Custom Header */}
      <LinearGradient
        colors={["#3986f9", "#5a9eff"]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Companies</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/delivery/RegisterAgentScreen")}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {agents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <FontAwesome5 name="truck" size={64} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>No Delivery Companies</Text>
          <Text style={styles.emptyText}>
            No delivery companies registered yet. Add your first delivery
            company to get started!
          </Text>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push("/delivery/RegisterAgentScreen")}
          >
            <LinearGradient
              colors={["#3986f9", "#5a9eff"]}
              style={styles.registerGradient}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.registerButtonText}>Register Company</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={agents}
          renderItem={renderAgentCard}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <BlurView
          intensity={isIOS ? 40 : 70}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <LinearGradient
              colors={["#3986f9", "#5a9eff"]}
              style={styles.modalHeaderGradient}
            >
              <Text style={styles.modalTitle}>Edit Company</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalBody}
            >
              <View style={styles.formGroup}>
                <Text style={styles.label}>Company Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.company_name}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, company_name: text })
                  }
                  placeholder="Enter company name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.phone_number}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, phone_number: text })
                  }
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Vehicle Type</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.vehicle_type}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, vehicle_type: text })
                  }
                  placeholder="e.g., Motorcycle, Car, Van, Truck"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Delivery Type</Text>
                <View style={styles.optionsGrid}>
                  <TouchableOpacity
                    style={[
                      styles.optionChip,
                      editForm.delivery_type === "intrastate" &&
                        styles.optionChipActive,
                    ]}
                    onPress={() =>
                      setEditForm({ ...editForm, delivery_type: "intrastate" })
                    }
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        editForm.delivery_type === "intrastate" &&
                          styles.optionChipTextActive,
                      ]}
                    >
                      Intrastate
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.optionChip,
                      editForm.delivery_type === "interstate" &&
                        styles.optionChipActive,
                    ]}
                    onPress={() =>
                      setEditForm({ ...editForm, delivery_type: "interstate" })
                    }
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        editForm.delivery_type === "interstate" &&
                          styles.optionChipTextActive,
                      ]}
                    >
                      Interstate
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.optionChip,
                      editForm.delivery_type === "national" &&
                        styles.optionChipActive,
                    ]}
                    onPress={() =>
                      setEditForm({ ...editForm, delivery_type: "national" })
                    }
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        editForm.delivery_type === "national" &&
                          styles.optionChipTextActive,
                      ]}
                    >
                      National
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Coverage Area</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.coverage_area}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, coverage_area: text })
                  }
                  placeholder="e.g., Lagos Mainland, Abuja FCT (comma-separated)"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.helperText}>
                  Enter multiple areas separated by commas
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.state}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, state: text })
                  }
                  placeholder="Enter state"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Local Government Area</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.local_government}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, local_government: text })
                  }
                  placeholder="Enter LGA"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Location/Address</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.location}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, location: text })
                  }
                  placeholder="Enter your full address"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editForm.description}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, description: text })
                  }
                  placeholder="Describe your delivery services"
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TouchableOpacity
                style={styles.updateButton}
                onPress={updateAgent}
                disabled={updating}
              >
                <LinearGradient
                  colors={["#3986f9", "#5a9eff"]}
                  style={styles.updateButtonGradient}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.updateButtonText}>Update Company</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
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
        <BlurView
          intensity={isIOS ? 40 : 70}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDeleteConfirmVisible(false)}
          />
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmIconContainer}>
              <LinearGradient
                colors={["#EF4444", "#DC2626"]}
                style={styles.confirmIconGradient}
              >
                <Ionicons name="warning" size={32} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.confirmTitle}>Delete Company?</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to delete &quot;
              {selectedAgent?.company_name}&quot;? This action cannot be undone.
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={deleteAgent}
                disabled={updating}
              >
                <LinearGradient
                  colors={["#EF4444", "#DC2626"]}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 8 : 40,
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: "#3986f9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  agentCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E6F2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editBtn: {
    backgroundColor: "#E6F2FF",
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0066CC",
  },
  statusActionBtn: {
    backgroundColor: "#F3F4F6",
  },
  statusActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteBtn: {
    backgroundColor: "#FEE2E2",
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  registerButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  registerGradient: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    gap: 8,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    overflow: "hidden",
  },
  modalHeaderGradient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#fff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  optionChipActive: {
    backgroundColor: "#0066CC",
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  optionChipTextActive: {
    color: "#fff",
  },
  updateButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 20,
  },
  updateButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmModalContent: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -width * 0.4 }, { translateY: -100 }],
    width: width * 0.8,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  confirmIconContainer: {
    marginBottom: 16,
  },
  confirmIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  confirmCancelText: {
    color: "#6B7280",
    fontWeight: "600",
  },
  confirmDeleteBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  confirmDeleteGradient: {
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmDeleteText: {
    color: "#fff",
    fontWeight: "600",
  },
});
