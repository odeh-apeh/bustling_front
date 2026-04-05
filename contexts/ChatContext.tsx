import React, { createContext, useContext, useState, useEffect } from 'react';
import { StreamChat, Channel } from 'stream-chat';

type ChatContextType = {
  client: StreamChat | null;
  channel: Channel | null;
  setupChatClient: (
    userId: string, 
    userToken: string, 
    userName?: string, 
    userImage?: string
  ) => Promise<StreamChat>;
  disconnect: () => Promise<void>;
  createChannel: (
    sellerId: string, 
    productId: string, 
    productName?: string
  ) => Promise<Channel>;
  isConnected: boolean;
};

const ChatContext = createContext<ChatContextType>({
  client: null,
  channel: null,
  setupChatClient: async () => { 
    throw new Error('ChatContext not initialized'); 
  },
  disconnect: async () => {},
  createChannel: async () => { 
    throw new Error('Chat client not initialized'); 
  },
  isConnected: false,
});

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const setupChatClient = async (
    userId: string, 
    userToken: string, 
    userName?: string, 
  ): Promise<StreamChat> => {
    try {
      console.log("🔄 Setting up chat client for userId:", userId);
      
      // 🔥 REPLACE WITH YOUR ACTUAL STREAM API KEY
      const apiKey = 'jamntkv65en4';

      // Initialize Stream Chat client
      const chatClient = StreamChat.getInstance(apiKey);
      
      console.log("🔌 Connecting user...");
      
      // Connect the user
      await chatClient.connectUser(
        {
          id: userId,
          name: userName || 'User',
        },
        userToken
      );
      
      console.log("✅ User connected successfully");
      console.log("👤 Connected as:", chatClient.userID);
      
      setClient(chatClient);
      setIsConnected(true);
      
      return chatClient;
    } catch (error) {
      console.error('❌ Error setting up chat client:', error);
      setIsConnected(false);
      throw error;
    }
  };

  const createChannel = async (
    sellerId: string, 
    productId: string, 
    productName?: string
  ): Promise<Channel> => {
    if (!client) {
      throw new Error('Chat client not initialized. Call setupChatClient first.');
    }
    
    try {
      // Get current user ID
      const currentUser = client.userID;
      if (!currentUser) {
        throw new Error('User not connected to chat');
      }
      
      // Create a unique channel ID
      const channelId = `commerce_${productId}_${currentUser}_${sellerId}`;
      
      console.log('🔄 Creating channel:', {
        channelId,
        currentUser,
        sellerId,
        productId,
        productName
      });
      
      // Create the channel
      const channel = client.channel('commerce', channelId, {
        name: productName || `Product ${productId}`,
        members: [currentUser, sellerId],
        created_by_id: currentUser,
        product_id: productId,
        buyer_id: currentUser,
        seller_id: sellerId,
      } as any); // Use 'as any' to bypass TypeScript
      
      // Create the channel on Stream
      await channel.create();
      
      setChannel(channel);
      console.log('✅ Channel created successfully:', channelId);
      
      return channel;
    } catch (error: any) {
      console.error('❌ Error creating channel:', error);
      
      // Check if channel already exists
      if (error.code === 16 || error.message?.includes('already exists')) {
        console.log('ℹ️ Channel already exists, connecting to it...');
        const currentUser = client.userID;
        const channelId = `commerce_${productId}_${currentUser}_${sellerId}`;
        const existingChannel = client.channel('commerce', channelId);
        await existingChannel.watch();
        setChannel(existingChannel);
        return existingChannel;
      }
      
      throw error;
    }
  };

  const disconnect = async (): Promise<void> => {
    try {
      if (client) {
        await client.disconnectUser();
        console.log('✅ Chat client disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting chat client:', error);
    } finally {
      setClient(null);
      setChannel(null);
      setIsConnected(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <ChatContext.Provider 
      value={{
        client,
        channel,
        setupChatClient,
        disconnect,
        createChannel,
        isConnected,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};