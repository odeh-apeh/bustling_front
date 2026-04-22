import React, { useState, useEffect, useCallback, use } from "react";
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
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
  RefreshControl,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { BASE_URL } from "@/helpers/core-service";
import { openDialer } from "@/helpers/misc";
import { useToast } from "@/contexts/toast-content";
import { StatusBar } from "expo-status-bar";

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
  delivery_types?: string;
};

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
  const [refreshing, setRefreshing] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [selectedState, setSelectedState] = useState<string>("All States");
  const {showToast, setMarketVisible} = useToast();

  const orderId = params.orderId as string;
  const productName = params.productName as string;
  const sellerName = params.sellerName as string;

  const checkIfLoggedIn = async (): Promise<boolean> => {
    try {
      setCheckingAuth(true);
      const response = await fetch(`${BASE_URL}/api/chat/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      return response.ok;
    } catch (error) {
      console.error("Auth check error:", error);
      return false;
    } finally {
      setCheckingAuth(false);
    }
  };

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
      
      if (data.success && data.companies) {
        const transformedAgents = data.companies.map((agent: any) => {
          let coverage = "Standard Delivery";
          if (agent.coverage_area) {
            coverage = agent.coverage_area;
          } else if (agent.coverage_type) {
            coverage = agent.coverage_type;
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
            delivery_types: agent.delivery_types || ""
          };
        });
        
        setDeliveryAgents(transformedAgents);
        setFilteredAgents(transformedAgents);
      } else {
        showToast(data.message || "Failed to load delivery companies", 'error');
      }
    } catch (error) {
      console.error('❌ Error fetching delivery companies:', error);
      showToast("Failed to load delivery companies. Please check your connection.", 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDeliveryCompanies();
  }, []);

  useEffect(() => {
    fetchDeliveryCompanies();
  }, []);

  useFocusEffect(
      useCallback(() => {
        const onBackPress = () => {
          // Your custom function here
          setMarketVisible(true);
          router.back();
          // Return true to prevent default behavior, false to allow it
          return true;
        };
        
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        
        return () => {
          subscription.remove();
        };
      }, [])
    );

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

  const handleMessageClick = async (agent: DeliveryAgent) => {
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
    
    if(agent.phone_number)
    openDialer({phoneNumber: agent.phone_number, onError:(err) => showToast(err,'error')})
  };

  const handleRequestDelivery = async (agent: DeliveryAgent) => {
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
    
    router.push({
      pathname: "/delivery/AgreePriceScreen",
      params: { 
        deliveryCompanyId: agent.id,
        deliveryCompanyName: agent.company_name,
        agentUserId: agent.user_id,
        ...(orderId && { orderId }),
        ...(productName && { productName }),
        ...(sellerName && { sellerName }),
      },
    });
  };

  const handleEditDelivery = async (index: number) => {
    const userId = deliveryAgents.find((userId) => userId)?.user_id;
    const company = deliveryAgents[index].company_name;
    router.push({
      pathname:"/delivery/ManageDeliveryAgent",
      params:{
        userId: userId,
        companyName: company
      }
    })
  }

  const getDeliveryTypeText = (coverage: string) => {
    if (!coverage || coverage === "Standard Delivery") return "Standard";
    const coverageLower = coverage.toLowerCase();
    if (coverageLower.includes('interstate')) return "Inter-state";
    if (coverageLower.includes('intrastate')) return "Intra-state";
    if (coverageLower.includes('local')) return "Local";
    if (coverageLower.includes('regional')) return "Regional";
    if (coverageLower.includes('national')) return "National";
    return coverage.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };


  const getDeliveryTypeColor = (coverage: string) => {
    if (!coverage) return "#10B981";
    const coverageLower = coverage.toLowerCase();
    if (coverageLower.includes('interstate')) return "#3B82F6";
    if (coverageLower.includes('intrastate')) return "#F59E0B";
    if (coverageLower.includes('local')) return "#10B981";
    if (coverageLower.includes('regional')) return "#8B5CF6";
    if (coverageLower.includes('national')) return "#EF4444";
    return "#6B7280";
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone === 'Not provided') return phone;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    } else if (digits.length === 10) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return phone;
  };

  const getAgentCountByState = (stateName: string) => {
    if (stateName === "All States") return deliveryAgents.length;
    return deliveryAgents.filter(agent => agent.state?.toLowerCase() === stateName.toLowerCase()).length;
  };

  const directToWhatsapp = (phone: string) => {
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}`;
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert("Error", "Cannot open WhatsApp");
    });
  };

  const renderAgentItem = (agent: DeliveryAgent, index: number) => (
    <TouchableOpacity
    key={agent.id}
     onPress={() => handleEditDelivery(index)}>
    <LinearGradient
      
      colors={['#FFFFFF', '#F9FAFB']}
      style={styles.agentCard}
    >
      <View style={styles.agentImagePlaceholder}>
        <LinearGradient
          colors={['#E6F2FF', '#F0F7FF']}
          style={styles.imageGradient}
        >
          <Ionicons name="business" size={32} color="#0066CC" />
        </LinearGradient>
      </View>
      
      <View style={styles.agentInfo}>
        <View style={styles.companyHeader}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{agent.company_name}</Text>
            <View style={[styles.statusContainer, { backgroundColor: agent.status === 'active' ? '#D1FAE5' : '#FEF3C7' }]}>
              <View style={[styles.statusDot, { backgroundColor: agent.status === 'active' ? "#10B981" : "#F59E0B" }]} />
              <Text style={[styles.statusText, { color: agent.status === 'active' ? "#10B981" : "#F59E0B" }]}>
                {agent.status === 'active' ? 'Available' : 'Busy'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.contactRow}>
          <View style={styles.contactItem}>
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text style={styles.contactText} numberOfLines={1}>
              {agent.location || 'Location not specified'}
            </Text>
          </View>
          
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={14} color="#6B7280" />
            <Text style={styles.contactText}>
              {formatPhoneNumber(agent.phone_number || '')}
            </Text>
          </View>
        </View>

        {agent.description && (
          <Text style={styles.description} numberOfLines={2}>
            {agent.description}
          </Text>
        )}

        <View style={styles.detailsRow}>
          {agent.vehicle_type && agent.vehicle_type !== "Various" && (
            <View style={styles.detailItem}>
              <Ionicons name="car-outline" size={12} color="#6B7280" />
              <Text style={styles.detailText}>{agent.vehicle_type}</Text>
            </View>
          )}
          
          {agent.coverage_area && (
            <View style={[styles.coverageBadge, { backgroundColor: getDeliveryTypeColor(agent.coverage_area) }]}>
              <Text style={styles.coverageText}>
                {agent.delivery_types}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => handleMessageClick(agent)}
            disabled={checkingAuth}
          >
            <Ionicons name="call-outline" size={16} color="#0066CC" />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.requestButton}
            onPress={() => handleRequestDelivery(agent)}
          >
            <LinearGradient
              colors={['#0066CC', '#3986f9']}
              style={styles.requestButtonGradient}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.requestButtonText}>Request</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.whatsappButton}
            onPress={() => directToWhatsapp(agent.phone_number || '')}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Finding delivery partners...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar backgroundColor={'#1260d4'} />
      
      <View style={styles.innerContainer}>
        {/* Header */}
        <LinearGradient
          colors={['#0066CC', '#3986f9']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => {
              router.back();
              setMarketVisible(true);
            }} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Delivery Partners</Text>
            <View style={{flexDirection:'row', alignItems:'center', gap: 12}}>
               <TouchableOpacity
              style={styles.registerAgentBtn}
              onPress={() => router.push("/delivery/RegisterAgentScreen")}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.registerAgentText}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/delivery/ManageDeliveryAgent")}>
            <Ionicons name={'ellipsis-vertical'} size={22} color={'white'}></Ionicons>
            </TouchableOpacity>
            </View>
           
          </View>
        </LinearGradient>

        {/* State Filter */}
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
                    {state === "All States" ? "All" : state.length > 10 ? state.slice(0, 8) + "..." : state}
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

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{filteredAgents.length}</Text>
            <Text style={styles.statLabel}>Available Partners</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {filteredAgents.filter(a => a.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active Now</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {filteredAgents.filter(a => a.coverage_area?.toLowerCase().includes('interstate')).length}
            </Text>
            <Text style={styles.statLabel}>Inter-state</Text>
          </View>
        </View>

        {/* Agents List */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0066CC']} tintColor="#0066CC" />
          }
        >
          {filteredAgents.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="car-outline" size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyStateTitle}>
                {selectedState === "All States" ? "No Delivery Partners Yet" : `No Partners in ${selectedState}`}
              </Text>
              <Text style={styles.emptyStateText}>
                {selectedState === "All States"
                  ? "Be the first to register as a delivery partner and start earning!"
                  : "Try selecting a different state or check back later."}
              </Text>
              {selectedState !== "All States" && (
                <TouchableOpacity 
                  style={styles.clearFilterBtn}
                  onPress={() => setSelectedState("All States")}
                >
                  <Text style={styles.clearFilterBtnText}>View All Partners</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.registerEmptyBtn}
                onPress={() => router.push("/delivery/RegisterAgentScreen")}
              >
                <LinearGradient
                  colors={['#0066CC', '#3986f9']}
                  style={styles.registerEmptyGradient}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.registerEmptyText}>Register Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            filteredAgents.map((agent, index) => renderAgentItem(agent, index))
          )}
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>

      {/* Floating Action Button
      <TouchableOpacity 
        style={styles.floatingButton} 
        onPress={() => router.push("/delivery/ManageDeliveryAgent")}
      >
        <LinearGradient
          colors={['#0066CC', '#3986f9']}
          style={styles.floatingButtonGradient}
        >
          <Ionicons name="options" size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  innerContainer: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 8 : 40,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#0066CC',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: '#fff',
  },
  registerAgentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    gap: 4,
  },
  registerAgentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  stateFilterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 12,
  },
  stateFilterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  stateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    gap: 6,
  },
  stateFilterButtonSelected: {
    backgroundColor: '#0066CC',
  },
  stateFilterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  stateFilterTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  stateCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    minWidth: 22,
    alignItems: 'center',
  },
  stateCountBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stateCountText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  stateCountTextSelected: {
    color: '#fff',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0066CC',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  agentCard: {
    flexDirection: 'row',
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  agentImagePlaceholder: {
    marginRight: 16,
  },
  imageGradient: {
    width: 70,
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentInfo: {
    flex: 1,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
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
  contactRow: {
    gap: 6,
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: '#6B7280',
  },
  coverageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  coverageText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#0066CC',
    backgroundColor: '#fff',
  },
  callButtonText: {
    color: '#0066CC',
    fontSize: 12,
    fontWeight: '600',
  },
  requestButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  requestButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  whatsappButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#DCF8C6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  clearFilterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 12,
  },
  clearFilterBtnText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
  },
  registerEmptyBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  registerEmptyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  registerEmptyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 20 : 10,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});