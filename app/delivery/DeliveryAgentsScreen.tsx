import React, { useState, useEffect } from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";
import { openDialer } from "@/helpers/misc";
import { useToast } from "@/contexts/toast-content";

const { width } = Dimensions.get("window");
const isIOS = Platform.OS === 'ios';

type DeliveryAgent = {
  id: string;
  company_name: string;
  coverage_area: string;
  vehicle_type?: string;
  description?: string;
  status?: string;
  user_id: string;
  phone_number?: string;
  location?: string;
  state?: string;
  local_government?: string;
  has_location?: boolean;
  coverage_type?: string;
};

// Nigerian states for filtering
const NIGERIAN_STATES = [
  "All States",
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Federal Capital Territory",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export default function DeliveryAgentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [selectedState, setSelectedState] = useState<string>("All States");
  const {showToast, setMarketVisible} = useToast();

  // Get optional orderId from params if coming from order
  const orderId = params.orderId as string;
  const productName = params.productName as string;
  const sellerName = params.sellerName as string;

  // Check if user is logged in by calling chat token endpoint
  const checkIfLoggedIn = async (): Promise<boolean> => {
    try {
      setCheckingAuth(true);
      const response = await fetch(`${BASE_URL}/api/chat/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (response.ok) {
        console.log("✅ User is logged in (session valid)");
        return true;
      } else {
        console.log("❌ User is NOT logged in");
        return false;
      }
    } catch (error) {
      console.error("Auth check error:", error);
      return false;
    } finally {
      setCheckingAuth(false);
    }
  };

  // Fetch delivery companies from backend
  useEffect(() => {
    fetchDeliveryCompanies();
  }, []);

  // Filter agents when selectedState changes
  useEffect(() => {
    if (selectedState === "All States") {
      setFilteredAgents(deliveryAgents);
    } else {
      const filtered = deliveryAgents.filter(agent => 
        agent.state?.toLowerCase() === selectedState.toLowerCase()
      );
      setFilteredAgents(filtered);
    }
  }, [selectedState, deliveryAgents]);

  const fetchDeliveryCompanies = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching delivery companies...");
      
      const response = await fetch(`${BASE_URL}/api/delivery/companies`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      console.log('📦 Delivery companies API response:', JSON.stringify(data, null, 2));
      
      if (data.success && data.companies) {
        // Transform data properly
        const transformedAgents = data.companies.map((agent: any) => {
          console.log("🔍 Processing agent:", agent);
          
          // Determine coverage area
          let coverage = "Standard Delivery";
          if (agent.coverage_area) {
            coverage = agent.coverage_area;
          } else if (agent.coverage_type) {
            coverage = agent.coverage_type;
          }
          
          // Determine location
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
            ...agent,
            id: agent.id?.toString() || Math.random().toString(),
            company_name: agent.company_name || "Delivery Company",
            coverage_area: coverage,
            location: location,
            state: agent.state || "",
            phone_number: agent.phone_number || agent.phone || "Not provided",
            vehicle_type: agent.vehicle_type || agent.vehicle || "Various",
            description: agent.description || agent.about || "",
            status: agent.status || "active",
            user_id: agent.user_id || agent.userId || "",
          };
        });
        
        console.log("✅ Transformed agents:", transformedAgents);
        setDeliveryAgents(transformedAgents);
        setFilteredAgents(transformedAgents);
      } else {
        console.error("❌ API error:", data.message);
        Alert.alert("Error", data.message || "Failed to load delivery companies");
      }
    } catch (error) {
      console.error('❌ Error fetching delivery companies:', error);
      Alert.alert("Error", "Failed to load delivery companies. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Handle message button click
  const handleMessageClick = async (agent: DeliveryAgent) => {
    // Check if user is logged in
    const isLoggedIn = await checkIfLoggedIn();
    
    if (!isLoggedIn) {
      Alert.alert(
        "Login Required",
        "Please log in to message the delivery agent",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => router.push("/login/LoginScreen") }
        ]
      );
      return;
    }
    
    // User is logged in, proceed to chat
    // router.push({
    //   pathname: "/chat/ChatScreen",
    //   params: { 
    //     sellerId: agent.user_id, 
    //     sellerName: agent.company_name,
    //     isDeliveryAgent: "true",
    //     productName: productName || "Delivery Request",
    //     orderId: orderId || "",
    //   },
    // });
    if(agent.phone_number)
    openDialer({phoneNumber: agent.phone_number, onError:(err) => showToast(err,'error')})
  };

  // Handle request delivery button click - NO ORDER ID REQUIRED
  const handleRequestDelivery = async (agent: DeliveryAgent) => {
    console.log("🚀 Requesting delivery from:", agent.company_name);
    
    // Check if user is logged in
    const isLoggedIn = await checkIfLoggedIn();
    
    if (!isLoggedIn) {
      Alert.alert(
        "Login Required",
        "Please log in to request delivery service",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => router.push("/login/LoginScreen") }
        ]
      );
      return;
    }
    
    // User is logged in, navigate to delivery request form
    router.push({
      pathname: "/delivery/AgreePriceScreen",
      params: { 
        deliveryCompanyId: agent.id,
        deliveryCompanyName: agent.company_name,
        agentUserId: agent.user_id,
        // Pass order details if available (optional)
        ...(orderId && { orderId }),
        ...(productName && { productName }),
        ...(sellerName && { sellerName }),
      },
    });
  };

  // Helper functions to generate UI data
  const getDeliveryTypeText = (coverage: string) => {
    if (!coverage || coverage === "Standard Delivery") {
      return "Standard Delivery";
    }
    
    const coverageLower = coverage.toLowerCase();
    
    if (coverageLower.includes('interstate') || coverageLower.includes('inter-state')) {
      return "Inter-state";
    } else if (coverageLower.includes('intrastate') || coverageLower.includes('intra-state')) {
      return "Intra-state";
    } else if (coverageLower.includes('local')) {
      return "Local";
    } else if (coverageLower.includes('regional')) {
      return "Regional";
    } else if (coverageLower.includes('national')) {
      return "National";
    } else {
      // Capitalize first letter of each word
      return coverage.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
  };

  const getDeliveryTypeColor = (coverage: string) => {
    if (!coverage) return "#4CAF50";
    
    const coverageLower = coverage.toLowerCase();
    
    if (coverageLower.includes('interstate') || coverageLower.includes('inter-state')) {
      return "#2196F3"; // Blue for interstate
    } else if (coverageLower.includes('intrastate') || coverageLower.includes('intra-state')) {
      return "#FF9800"; // Orange for intrastate
    } else if (coverageLower.includes('local')) {
      return "#4CAF50"; // Green for local
    } else if (coverageLower.includes('regional')) {
      return "#9C27B0"; // Purple for regional
    } else if (coverageLower.includes('national')) {
      return "#F44336"; // Red for national
    } else {
      return "#607D8B"; // Blue grey for others
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone === 'Not provided') return phone;
    
    // Remove any non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Format as Nigerian phone number: 0803 123 4567
    if (digits.length === 11) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    } else if (digits.length === 10) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    
    return phone;
  };

  // Get count of agents by state
  const getAgentCountByState = (stateName: string) => {
    if (stateName === "All States") {
      return deliveryAgents.length;
    }
    return deliveryAgents.filter(agent => 
      agent.state?.toLowerCase() === stateName.toLowerCase()
    ).length;
  };

  const directToWhatsapp = (phone: string) => {
      const whatsappUrl = `https://wa.me/${phone}`;
      Linking.openURL(whatsappUrl).catch(() => {
        Alert.alert("Error", "Cannot open WhatsApp");
      });
    };
  

  const renderAgentItem = (agent: DeliveryAgent) => (
    <View style={styles.agentCard}>
      {/* Company Logo Placeholder */}
      <View style={styles.agentImagePlaceholder}>
        <Ionicons name="business" size={30} color="#007AFF" />
      </View>
      
      <View style={styles.agentInfo}>
        {/* Company Header */}
        <View style={styles.companyHeader}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{agent.company_name}</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { 
                backgroundColor: agent.status === 'active' ? "#4CAF50" : "#FF9800" 
              }]} />
              <Text style={styles.statusText}>
                {agent.status === 'active' ? 'Available' : 'Busy'}
              </Text>
            </View>
          </View>
        </View>

        {/* Location & Phone */}
        <View style={styles.contactRow}>
          <View style={styles.contactItem}>
            <Ionicons name="location-outline" size={12} color="#666" />
            <Text style={styles.contactText} numberOfLines={1}>
              {agent.location || 'Location not specified'}
            </Text>
          </View>
          
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={12} color="#666" />
            <Text style={styles.contactText}>
              {formatPhoneNumber(agent.phone_number || '')}
            </Text>
          </View>
        </View>

        {/* Description */}
        {agent.description && (
          <Text style={styles.description} numberOfLines={2}>
            {agent.description}
          </Text>
        )}

        {/* Vehicle Type and Coverage - FIXED */}
        <View style={styles.detailsRow}>
          {agent.vehicle_type && agent.vehicle_type !== "Various" && (
            <View style={styles.detailItem}>
              <Ionicons name="car-outline" size={12} color="#666" />
              <Text style={styles.detailText}>{agent.vehicle_type}</Text>
            </View>
          )}
          
          {agent.coverage_area && (
            <View style={styles.detailItem}>
              <View style={[styles.coverageBadge, { 
                backgroundColor: getDeliveryTypeColor(agent.coverage_area) 
              }]}>
                <Text style={styles.coverageText}>
                  {getDeliveryTypeText(agent.coverage_area)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={() => handleMessageClick(agent)}
            disabled={checkingAuth}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="call" size={14} color="#007AFF" />
              <Text style={styles.messageButtonText} numberOfLines={1}>
                {checkingAuth ? "..." : "Call"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.requestButton}
            onPress={() => handleRequestDelivery(agent)}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
              <Text style={styles.requestButtonText} numberOfLines={1}>
                Request
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{
              display:'flex',
              justifyContent:'center',
              alignItems:'center',
              borderWidth:1,
              borderColor:'#007AFF',
              borderRadius:6,
              paddingVertical:8,
              paddingHorizontal:10,
            }}
            onPress={() => directToWhatsapp(agent.phone_number || '')}
          >
            <View style={styles.buttonContent}>
              <Ionicons name='logo-whatsapp' size={19} color={'green'} />
            </View>
          </TouchableOpacity>

          
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ 
          headerShown: false,
          statusBarStyle: 'dark',
          statusBarBackgroundColor: '#fff',
        }} />
        <View style={styles.innerContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Delivery Partners</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading delivery partners...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
          <TouchableOpacity onPress={() => 
          {
            router.back();
            setMarketVisible(true);
          }} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
            <Text style={styles.backText}></Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Partners</Text>
          
          {/* Register Agent Button */}
          <TouchableOpacity
            style={styles.deliveryAgentBtn}
            onPress={() => router.push("/delivery/RegisterAgentScreen")}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.deliveryAgentText}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* State Filter Tabs - Horizontal Scroll */}
        <View style={styles.stateFilterContainer}>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stateFilterScrollContent}
          >
            {NIGERIAN_STATES.map((state) => {
              const isSelected = selectedState === state;
              const agentCount = getAgentCountByState(state);
              
              return (
                <TouchableOpacity
                  key={state}
                  style={[
                    styles.stateFilterButton,
                    isSelected && styles.stateFilterButtonSelected
                  ]}
                  onPress={() => setSelectedState(state)}
                >
                  <Text style={[
                    styles.stateFilterText,
                    isSelected && styles.stateFilterTextSelected
                  ]}>
                    {state}
                  </Text>
                  <View style={[
                    styles.stateCountBadge,
                    isSelected && styles.stateCountBadgeSelected
                  ]}>
                    <Text style={[
                      styles.stateCountText,
                      isSelected && styles.stateCountTextSelected
                    ]}>
                      {agentCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={18} color="#007AFF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Need Delivery Service?</Text>
            <Text style={styles.infoText}>
              • Filter by state to find agents near you{"\n"}
              • Message any delivery partner to negotiate terms{"\n"}
              • Request service to book them for your delivery
            </Text>
          </View>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{filteredAgents.length}</Text>
            <Text style={styles.statLabel}>Showing</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {filteredAgents.filter(a => a.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {filteredAgents.filter(a => a.coverage_area?.toLowerCase().includes('interstate')).length}
            </Text>
            <Text style={styles.statLabel}>Inter-state</Text>
          </View>
        </View>

        {/* State Info Banner (when filtered) */}
        {selectedState !== "All States" && (
          <View style={styles.stateInfoBanner}>
            <Ionicons name="filter" size={16} color="#007AFF" />
            <Text style={styles.stateInfoText}>
              Showing delivery partners in <Text style={styles.stateHighlight}>{selectedState}</Text>
            </Text>
            <TouchableOpacity 
              style={styles.clearFilterButton}
              onPress={() => setSelectedState("All States")}
            >
              <Text style={styles.clearFilterText}>Show All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Delivery Agents List */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredAgents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={50} color="#ccc" />
              <Text style={styles.emptyStateTitle}>
                {selectedState === "All States" 
                  ? "No Delivery Partners Yet" 
                  : `No Delivery Partners in ${selectedState}`}
              </Text>
              <Text style={styles.emptyStateText}>
                {selectedState === "All States"
                  ? "Be the first to register as a delivery partner and start earning!"
                  : "Try selecting a different state or check back later for partners in this area."}
              </Text>
              {selectedState !== "All States" && (
                <TouchableOpacity 
                  style={styles.stateFilterButtonInEmpty}
                  onPress={() => setSelectedState("All States")}
                >
                  <Text style={styles.stateFilterButtonTextInEmpty}>View All Partners</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.registerButton}
                onPress={() => router.push("/delivery/RegisterAgentScreen")}
              >
                <Text style={styles.registerButtonText}>Register Now</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={fetchDeliveryCompanies}
              >
                <Text style={styles.retryButtonText}>Refresh List</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredAgents.map((agent) => (
              <View key={agent.id}>
                {renderAgentItem(agent)}
              </View>
            ))
          )}
          
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
    paddingHorizontal: 15,
    paddingTop: isIOS ? 10 : 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    marginLeft: 5,
    fontSize: 16,
    color: "#000",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  placeholder: {
    width: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  deliveryAgentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    minWidth: 90,
  },
  deliveryAgentText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  // State Filter Styles
  stateFilterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  stateFilterScrollContent: {
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  stateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 8,
    minHeight: 32,
  },
  stateFilterButtonSelected: {
    backgroundColor: '#007AFF',
  },
  stateFilterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  stateFilterTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  stateCountBadge: {
    marginLeft: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateCountBadgeSelected: {
    backgroundColor: '#fff',
  },
  stateCountText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  stateCountTextSelected: {
    color: '#007AFF',
  },
  stateInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    gap: 8,
  },
  stateInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#007AFF',
  },
  stateHighlight: {
    fontWeight: '700',
  },
  clearFilterButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 4,
  },
  clearFilterText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8f9fa",
    padding: 12,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    gap: 8,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 2,
  },
  infoText: {
    color: "#666",
    fontSize: 11,
    lineHeight: 15,
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#f8f9ff",
    padding: 12,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#ddd",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  agentCard: {
    flexDirection: "row",
    backgroundColor: "#f8f9ff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e3f2fd",
  },
  agentImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
  },
  agentInfo: {
    flex: 1,
  },
  companyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    color: "#666",
  },
  contactRow: {
    flexDirection: "column",
    gap: 4,
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contactText: {
    fontSize: 11,
    color: "#666",
    flex: 1,
  },
  description: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    lineHeight: 16,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: "#666",
  },
  coverageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  coverageText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  messageButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 6,
    paddingVertical: 8,
  },
  requestButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 6,
    paddingVertical: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  messageButtonText: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: '600',
  },
  requestButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  stateFilterButtonInEmpty: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginBottom: 12,
  },
  stateFilterButtonTextInEmpty: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: "#666",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});