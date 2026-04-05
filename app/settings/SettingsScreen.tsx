import React, { useState } from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const router = useRouter();
  
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    smsAlerts: false,
    locationServices: true,
    darkMode: false,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: () => router.replace("/login/LoginScreen")
        }
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL("mailto:gapeh10@gmail.com");
  };

  const handlePrivacyPolicy = () => {
    // router.push("/legal/PrivacyPolicyScreen");
    Alert.alert("Privacy Policy", "Privacy policy page would open here");
  };

  const handleTermsOfService = () => {
    // router.push("/legal/TermsScreen");
    Alert.alert("Terms of Service", "Terms of service page would open here");
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    hasSwitch = false, 
    value = false, 
    onToggle, 
    onPress 
  }: any) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color="#007AFF" />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      {hasSwitch ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: "#f0f0f0", true: "#007AFF" }}
          thumbColor={value ? "#fff" : "#f4f3f4"}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <SettingItem
            icon="notifications-outline"
            title="Push Notifications"
            subtitle="Receive alerts for orders, messages, and updates"
            hasSwitch
            value={settings.notifications}
            onToggle={() => toggleSetting("notifications")}
          />
          
          <SettingItem
            icon="mail-outline"
            title="Email Updates"
            subtitle="Get product and service recommendations via email"
            hasSwitch
            value={settings.emailUpdates}
            onToggle={() => toggleSetting("emailUpdates")}
          />
          
          <SettingItem
            icon="chatbubble-outline"
            title="SMS Alerts"
            subtitle="Important updates via SMS"
            hasSwitch
            value={settings.smsAlerts}
            onToggle={() => toggleSetting("smsAlerts")}
          />
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          
          <SettingItem
            icon="location-outline"
            title="Location Services"
            subtitle="Show nearby products and services"
            hasSwitch
            value={settings.locationServices}
            onToggle={() => toggleSetting("locationServices")}
          />
          
          <SettingItem
            icon="moon-outline"
            title="Dark Mode"
            subtitle="Switch to dark theme"
            hasSwitch
            value={settings.darkMode}
            onToggle={() => toggleSetting("darkMode")}
          />
          
          <SettingItem
            icon="language-outline"
            title="Language"
            subtitle="English"
            onPress={() => Alert.alert("Language", "Language selection would appear here")}
          />
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <SettingItem
            icon="help-circle-outline"
            title="Help & Support"
            onPress={handleContactSupport}
          />
          
          <SettingItem
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            onPress={handlePrivacyPolicy}
          />
          
          <SettingItem
            icon="document-text-outline"
            title="Terms of Service"
            onPress={handleTermsOfService}
          />
          
          <SettingItem
            icon="information-circle-outline"
            title="About App"
            subtitle="Version 1.0.0"
            onPress={() => Alert.alert("About", "Your Marketplace App v1.0.0")}
          />
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <SettingItem
            icon="lock-closed-outline"
            title="Change Password"
            onPress={() => Alert.alert("Change Password", "Password change screen would open")}
          />
          
          <SettingItem
            icon="card-outline"
            title="Payment Methods"
            onPress={() => Alert.alert("Payment Methods", "Payment methods screen would open")}
          />
          
          <SettingItem
            icon="trash-outline"
            title="Delete Account"
            onPress={() => Alert.alert("Delete Account", "Account deletion process would start")}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
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
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#111",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ff3b30",
    borderRadius: 12,
  },
  logoutText: {
    color: "#ff3b30",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});