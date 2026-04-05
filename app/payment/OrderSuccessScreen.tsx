import React from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

type SuccessType = 'product' | 'service' | 'delivery';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get order data from params
  const orderId = params.orderId as string;
  const successType = (params.successType as SuccessType) || 'product';
  const itemTitle = params.itemTitle as string;
  const itemPrice = params.itemPrice as string;
  const sellerId = params.sellerId as string;
  const productId = params.productId as string;
  const deliveryCompanyName = params.deliveryCompanyName as string;
  const requiresDelivery = params.requiresDelivery !== 'false'; // Default to true

  const isProduct = successType === 'product';
  const isService = successType === 'service';
  const isDelivery = successType === 'delivery';
  const showDeliveryButton = (isProduct || (isService && requiresDelivery)) && !isDelivery;

  const handleDeliveryRequest = () => {
    // Only show for products and services that need delivery
    if (isProduct || (isService && requiresDelivery)) {
      router.push({
        pathname: "/delivery/DeliveryAgentsScreen",
        params: {
          orderId,
          successType,
          itemTitle,
          sellerId,
          productId: productId || null,
          requiresDelivery: requiresDelivery.toString(),
        }
      });
    }
  };

  const handleContactSeller = () => {
    // Navigate to chat with seller or delivery agent
    const targetId = isDelivery ? sellerId : params.deliveryAgentId || sellerId;
    const targetName = isDelivery ? deliveryCompanyName : params.sellerName || "Seller";
    
    router.push({
      pathname: "/chat/ChatScreen",
      params: {
        sellerId: targetId,
        sellerName: targetName,
        orderId: orderId,
        itemTitle: itemTitle,
        isDeliveryAgent: isDelivery ? "true" : "false",
      }
    });
  };

  const handleViewOrder = () => {
    if (isDelivery) {
      router.push({
        pathname: "/delivery/MyDeliveriesScreen",
        params: { deliveryId: orderId }
      });
    } else {
      router.push("/orders/OrderHistoryScreen");
    }
  };

  const handleGoHome = () => {
    router.replace("/home/Homescreen");
  };

  const getSuccessMessage = () => {
    switch (successType) {
      case 'delivery':
        return "Delivery Request Successful!";
      case 'service':
        return "Service Booked Successfully!";
      case 'product':
      default:
        return "Order Placed Successfully!";
    }
  };

  const getSubtitle = () => {
    switch (successType) {
      case 'delivery':
        return `Delivery has been assigned to ${deliveryCompanyName}. Your payment is secured in escrow and will be released upon delivery confirmation.`;
      case 'service':
        if (requiresDelivery) {
          return "Your service has been booked and payment is held in escrow. You can now request delivery.";
        }
        return "Your service has been booked! The service provider will contact you soon.";
      case 'product':
      default:
        return "Your order has been confirmed and payment is held in escrow.";
    }
  };

  const getDeliveryButtonText = () => {
    if (isService) {
      return "Request Service Delivery";
    }
    return "Request Delivery Agent";
  };

  const getContactButtonText = () => {
    if (isDelivery) {
      return `Message ${deliveryCompanyName}`;
    } else if (isService) {
      return "Contact Service Provider";
    }
    return "Contact Seller";
  };

  const getNextSteps = () => {
    switch (successType) {
      case 'delivery':
        return [
          {
            icon: "car-outline",
            text: "The delivery agent will contact you for pickup details"
          },
          {
            icon: "chatbubble-outline",
            text: "Message the delivery agent for updates"
          },
          {
            icon: "checkmark-circle-outline",
            text: "Confirm delivery after receiving your item to release payment"
          }
        ];
      
      case 'service':
        if (requiresDelivery) {
          return [
            {
              icon: "car-outline",
              text: "Request a delivery agent if service requires physical delivery"
            },
            {
              icon: "chatbubble-outline",
              text: "Contact the service provider for details"
            },
            {
              icon: "shield-checkmark-outline",
              text: "Your money is safe in escrow until service completion"
            }
          ];
        } else {
          return [
            {
              icon: "chatbubble-outline",
              text: "The service provider will contact you shortly"
            },
            {
              icon: "time-outline",
              text: "Track your service booking in Order History"
            },
            {
              icon: "shield-checkmark-outline",
              text: "Your money is safe in escrow until service completion"
            }
          ];
        }
      
      case 'product':
      default:
        return [
          {
            icon: "car-outline",
            text: "Request a delivery agent to get your item"
          },
          {
            icon: "time-outline",
            text: "Track your order in Order History"
          },
          {
            icon: "shield-checkmark-outline",
            text: "Your money is safe in escrow until delivery"
          }
        ];
    }
  };

  const getActionButtons = () => {
    const buttons = [];
    
    // Show delivery request button only for products/services (not for delivery requests)
    if (showDeliveryButton) {
      buttons.push({
        key: 'delivery',
        icon: "car-sport",
        text: getDeliveryButtonText(),
        onPress: handleDeliveryRequest,
        style: 'primary' as const,
      });
    }

    // Contact button (seller, service provider, or delivery agent)
    buttons.push({
      key: 'contact',
      icon: "chatbubble-outline",
      text: getContactButtonText(),
      onPress: handleContactSeller,
      style: 'outline' as const,
    });

    // View history button
    buttons.push({
      key: 'history',
      icon: "list-outline",
      text: isDelivery ? "View Delivery History" : "View Order History",
      onPress: handleViewOrder,
      style: 'outline' as const,
    });

    // Home button
    buttons.push({
      key: 'home',
      icon: "home-outline",
      text: "Go to Home",
      onPress: handleGoHome,
      style: 'secondary' as const,
    });

    return buttons;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoHome} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text style={styles.backText}>Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isDelivery ? "Delivery Confirmed" : isService ? "Booking Successful" : "Order Successful"}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <Ionicons 
            name={isDelivery ? "car-sport" : "checkmark-circle"} 
            size={80} 
            color={isDelivery ? "#007AFF" : "#4CAF50"} 
          />
        </View>

        {/* Success Message */}
        <View style={styles.messageSection}>
          <Text style={styles.successTitle}>{getSuccessMessage()}</Text>
          <Text style={styles.successSubtitle}>
            {getSubtitle()}
          </Text>
          
          {/* Order Details */}
          <View style={styles.orderDetails}>
            <Text style={styles.orderId}>
              {isDelivery ? "Delivery ID" : "Order ID"}: #{orderId}
            </Text>
            
            {itemTitle && (
              <Text style={styles.itemTitle}>
                {isDelivery ? "Delivery for: " : (isService ? "Service: " : "Product: ")}{itemTitle}
              </Text>
            )}
            
            {isDelivery && deliveryCompanyName && (
              <Text style={styles.deliveryCompany}>
                Delivery Agent: {deliveryCompanyName}
              </Text>
            )}
            
            {itemPrice && (
              <Text style={styles.itemPrice}>
                {isDelivery ? "Delivery Fee: " : "Amount: "}{itemPrice}
              </Text>
            )}
          </View>
        </View>

        {/* Next Steps */}
        <View style={styles.nextSteps}>
          <Text style={styles.nextStepsTitle}>Next Steps:</Text>
          {getNextSteps().map((step, index) => (
            <View key={index} style={styles.step}>
              <Ionicons name={step.icon as any} size={20} color="#007AFF" />
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Extra Space for Small Screens */}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {getActionButtons().map((button) => (
          <TouchableOpacity
            key={button.key}
            style={[
              styles.button,
              button.style === 'primary' && styles.primaryButton,
              button.style === 'outline' && styles.outlineButton,
              button.style === 'secondary' && styles.secondaryButton,
            ]}
            onPress={button.onPress}
          >
            <Ionicons 
              name={button.icon as any} 
              size={20} 
              color={
                button.style === 'primary' ? '#fff' : 
                button.style === 'outline' ? '#007AFF' : '#666'
              } 
            />
            <Text style={[
              styles.buttonText,
              button.style === 'primary' && styles.primaryButtonText,
              button.style === 'outline' && styles.outlineButtonText,
              button.style === 'secondary' && styles.secondaryButtonText,
            ]}>
              {button.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
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
    paddingTop: height * 0.06,
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
  },
  placeholder: {
    width: 70,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  successIcon: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  messageSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 10,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 22,
  },
  orderDetails: {
    alignItems: "center",
    marginTop: 10,
    padding: 15,
    backgroundColor: "#f8f9ff",
    borderRadius: 10,
    width: '100%',
  },
  orderId: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    marginBottom: 5,
    textAlign: "center",
  },
  deliveryCompany: {
    fontSize: 14,
    color: "#FF9800",
    fontWeight: "600",
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
  },
  nextSteps: {
    backgroundColor: "#f8f9ff",
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
    color: "#000",
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  stepText: {
    marginLeft: 10,
    color: "#666",
    fontSize: 14,
    flex: 1,
  },
  actionButtons: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
    gap: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 10,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  secondaryButton: {
    backgroundColor: "#f0f0f0",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButtonText: {
    color: "#fff",
  },
  outlineButtonText: {
    color: "#007AFF",
  },
  secondaryButtonText: {
    color: "#666",
  },
});