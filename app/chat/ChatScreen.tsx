import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Channel,
  MessageList,
  MessageInput,
  Chat,
} from "stream-chat-expo";
import { useChat } from "../../contexts/ChatContext";
import { BASE_URL } from "@/helpers/core-service";

// Check if device is iOS
const isIOS = Platform.OS === 'ios';

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const sellerId = params.sellerId as string;
  const productId = params.productId as string;
  const productName = params.productName as string || "Product Chat";
  const sellerName = params.sellerName as string || "Seller";

  const { client, setupChatClient, isConnected } = useChat();
  const [loading, setLoading] = useState(true);
  const [currentChannel, setCurrentChannel] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true);
        console.log("🚀 Starting chat initialization...");
        
        // 1. Get token from backend
        const tokenResponse = await fetch(`${BASE_URL}/api/chat/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!tokenResponse.ok) {
          throw new Error(`Token error: ${tokenResponse.status}`);
        }

        const data = await tokenResponse.json();
        const { token, userId, apiKey } = data;

        if (!token || !userId || !apiKey) {
          throw new Error('Missing required data from server');
        }

        console.log("✅ Token received for user:", userId);

        // 2. Setup chat client
        await setupChatClient(userId, token, apiKey, "User");
        console.log("✅ Chat client setup complete");

        // 3. Create channel
        const channelResponse = await fetch(`${BASE_URL}/api/chat/channel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sellerId, productId }),
        });

        if (!channelResponse.ok) {
          const errorText = await channelResponse.text();
          throw new Error(`Channel error: ${errorText}`);
        }

        const channelData = await channelResponse.json();
        console.log("✅ Channel created:", channelData.channelId);

        // 4. Get channel from client
        if (client && channelData.channelId) {
          const channel = client.channel('commerce', channelData.channelId);
          await channel.watch();
          setCurrentChannel(channel);
          console.log("✅ Channel connected and watching");
        }

        setInitialized(true);
        setLoading(false);
        
      } catch (error: any) {
        console.error('❌ Chat initialization error:', error);
        Alert.alert('Error', error.message || 'Failed to start chat');
        setLoading(false);
      }
    };

    if (sellerId && productId && !initialized) {
      initializeChat();
    }
  }, [sellerId, productId, initialized]);

  // Show loading
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Starting chat...</Text>
      </SafeAreaView>
    );
  }

  // Show error if not connected OR if no channel
  if (!client || !currentChannel) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>Chat not available</Text>
        <Text style={styles.errorSubtext}>
          {!client ? "Client not connected" : "Channel not created"}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setInitialized(false);
            setLoading(true);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.retryButton, { marginTop: 10, backgroundColor: '#666' }]}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Main chat interface
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {productName}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Chatting with {sellerName}
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Stream Chat Components */}
        <Chat client={client}>
          <View style={{ flex: 1 }}>
            <Channel 
              channel={currentChannel}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
              <View style={{ flex: 1 }}>
                <MessageList 
                  {...{
                    emptyState: () => (
                      <View style={styles.emptyMessagesContainer}>
                        <Ionicons name="chatbubble-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyMessagesText}>
                          No messages yet. Say hello!
                        </Text>
                      </View>
                    )
                  } as any}
                />
                <MessageInput />
              </View>
            </Channel>
          </View>
        </Chat>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    marginTop: isIOS ? 0 : 5,
  },
  backButton: {
    width: 40,
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyMessagesText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});