import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ActivityIndicator,
  Alert,
  Platform 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useChat } from "../../contexts/ChatContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/helpers/core-service";

type ChatItem = {
  id: string;
  name: string;
  lastMessage: string;
  unread: number;
  product: string;
  image: string | null;
  sellerId: string;
  sellerName: string;
  productId: string;
  productName: string;
  lastMessageAt: string;
  otherUserName: string; // Add this field
  otherUserAvatar: string | null; // Add this field
};

const isIOS = Platform.OS === 'ios';

export default function MessagesScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { client, isConnected } = useChat();

  // Fetch user's conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      console.log("🔄 Fetching conversations...");
      const response = await fetch(`${BASE_URL}/api/chat/channels`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      console.log("📡 Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", errorText);
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log("📦 API Response:", JSON.stringify(data, null, 2)); // Better logging
      
      if (data.success && Array.isArray(data.conversations)) {
        // Transform API data to ChatItem format
        const formattedConversations: ChatItem[] = data.conversations.map((conv: any) => {
          console.log("📝 Processing conversation:", conv);
          
          // Use otherUserName if available, otherwise try sellerName or fallback
          const displayName = conv.otherUserName || conv.sellerName || `User ${conv.sellerId || conv.otherUserId || 'Unknown'}`;
          
          return {
            id: conv.channelId || conv.id,
            name: displayName,
            lastMessage: conv.lastMessage?.text || conv.lastMessage || "No messages yet",
            unread: conv.unreadCount || conv.unread || 0,
            product: conv.productName || "Product",
            image: conv.otherUserAvatar || conv.productImage || null,
            sellerId: conv.sellerId || conv.otherUserId || "",
            sellerName: displayName,
            productId: conv.productId || "",
            productName: conv.productName || "Product",
            lastMessageAt: conv.lastMessageAt || conv.createdAt,
            otherUserName: displayName, // Store the actual name
            otherUserAvatar: conv.otherUserAvatar || null,
          };
        });
        
        console.log("✅ Formatted conversations:", formattedConversations.length);
        console.log("👥 Names:", formattedConversations.map(c => c.name));
        setConversations(formattedConversations);
      } else {
        console.error("❌ Invalid response structure:", data);
        Alert.alert("Error", data.message || "Failed to load conversations");
        setConversations([]); // Set empty array on error
      }
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      Alert.alert("Error", "Failed to load conversations");
      setConversations([]); // Set empty array on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, []);

  // Pull to refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  // Format time
  const formatTime = (timestamp: string) => {
    if (!timestamp) return "Now";
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return "Now";
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      return date.toLocaleDateString();
    } catch (e) {
      return "Now";
    }
  };

  // Filter conversations based on search
  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ 
          headerShown: false,
          statusBarStyle: 'dark',
          statusBarBackgroundColor: '#fff',
        }} />
        
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
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
      
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" />
        <TextInput
          placeholder="Search messages..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          placeholderTextColor="#999"
        />
      </View>

      {/* Chat list or empty state */}
      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a chat by messaging a seller about a product
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push("/market/BuyScreen")}
          >
            <Text style={styles.browseButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            console.log("🎯 Rendering chat item:", item.name);
            return (
              <TouchableOpacity
                style={styles.conversationItem}
                onPress={() =>
                  router.push({
                    pathname: "/chat/ChatScreen",
                    params: { 
                      sellerId: item.sellerId,
                      sellerName: item.name, // Use the display name
                      productId: item.productId,
                      productName: item.productName,
                      channelId: item.id,
                      productImage: item.image,
                    }
                  })
                }
              >
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  {item.image ? (
                    <Image 
                      source={{ uri: item.image }} 
                      style={styles.avatar} 
                      defaultSource={require('../../assets/images/user.png')}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.defaultAvatar]}>
                      <Text style={styles.avatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {item.unread > 0 && (
                    <View style={styles.unreadIndicator} />
                  )}
                </View>

                {/* Conversation details */}
                <View style={styles.conversationDetails}>
                  <View style={styles.row}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.time}>
                      {formatTime(item.lastMessageAt)}
                    </Text>
                  </View>
                  
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.product}
                  </Text>
                  
                  <Text 
                    style={[
                      styles.lastMessage,
                      item.unread > 0 && styles.unreadMessage
                    ]} 
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                </View>

                {/* Unread badge */}
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {item.unread > 99 ? '99+' : item.unread}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
          ListHeaderComponent={
            <Text style={styles.conversationsCount}>
              {filtered.length} conversation{filtered.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginTop: isIOS ? 0 : 5,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: '#000',
  },
  placeholder: {
    width: 26,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: { 
    flex: 1, 
    marginLeft: 12, 
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  browseButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  conversationsCount: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 10,
    fontWeight: '500',
  },
  conversationItem: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f8f8",
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    marginRight: 15,
  },
  defaultAvatar: {
    backgroundColor: "#007AFF",
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 15,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationDetails: {
    flex: 1,
  },
  row: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 4,
    alignItems: 'center',
  },
  name: { 
    fontSize: 16, 
    fontWeight: "600",
    color: '#333',
    flex: 1,
  },
  time: { 
    fontSize: 12, 
    color: "#999",
    marginLeft: 8,
  },
  productName: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  lastMessage: { 
    fontSize: 14, 
    color: "#999",
  },
  unreadMessage: {
    color: '#333',
    fontWeight: '500',
  },
  unreadBadge: { 
    backgroundColor: "#007AFF", 
    minWidth: 22, 
    height: 22, 
    borderRadius: 11,
    alignItems: "center", 
    justifyContent: "center",
    marginLeft: 8,
  },
  unreadText: { 
    color: "#fff", 
    fontSize: 12, 
    fontWeight: "600",
    paddingHorizontal: 6,
  },
});