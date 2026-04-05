import React from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function UploadTypeScreen() {
  const router = useRouter();

  const handleProductUpload = () => {
    router.push("/market/UploadProductScreen");
  };

  const handleServiceUpload = () => {
    router.push("/market/UploadServiceScreen");
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <Text style={styles.title}>What would you like to upload?</Text>
          <Text style={styles.subtitle}>Choose between product or service listing</Text>

          {/* Product Option */}
          <TouchableOpacity 
            style={styles.optionCard}
            onPress={handleProductUpload}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="cube-outline" size={40} color="#007AFF" />
            </View>
            <Text style={styles.optionTitle}>Product</Text>
            <Text style={styles.optionDescription}>
              List physical items like clothes, electronics, furniture, etc.
            </Text>
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                <Text style={styles.featureText}>Upload multiple images</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                <Text style={styles.featureText}>Set category-specific details</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                <Text style={styles.featureText}>Physical delivery</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Service Option */}
          <TouchableOpacity 
            style={styles.optionCard}
            onPress={handleServiceUpload}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="construct-outline" size={40} color="#34C759" />
            </View>
            <Text style={styles.optionTitle}>Service</Text>
            <Text style={styles.optionDescription}>
              Offer services like repairs, consultations, tutoring, cleaning, etc.
            </Text>
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.featureText}>Set service duration</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.featureText}>Define service location</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.featureText}>Service-based pricing</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.noteText}>
              Products are physical items that require shipping, while services are skills or expertise you offer.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 25,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    color: "#111",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  optionCard: {
    backgroundColor: "#f8f9ff",
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#f0f0f0",
  },
  optionIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    color: "#111",
  },
  optionDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  features: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 16,
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    marginTop: 10,
  },
  noteText: {
    fontSize: 12,
    color: "#856404",
    flex: 1,
    lineHeight: 16,
  },
});