// app/profile/ChangePasswordScreen.tsx
import React, { useState } from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "@/helpers/core-service";

export default function ChangePasswordScreen() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    const newErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Check if new password is same as current
    if (formData.currentPassword && formData.newPassword && 
        formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = "New password must be different from current password";
    }

    setErrors(newErrors);
    return !newErrors.currentPassword && !newErrors.newPassword && !newErrors.confirmPassword;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/user/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Password updated successfully", [
          {
            text: "OK",
            onPress: () => {
              // Clear form and go back
              setFormData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
              router.back();
            },
          },
        ]);
      } else {
        Alert.alert("Error", data.message || "Failed to update password");
      }
    } catch (error) {
      console.error("Change password error:", error);
      Alert.alert("Error", "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({ 
    label, 
    value, 
    onChangeText, 
    error, 
    showPassword, 
    onToggleVisibility,
    placeholder 
  }: any) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.passwordInputContainer, error && styles.inputError]}>
        <TextInput
          style={styles.passwordInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={onToggleVisibility} style={styles.eyeButton}>
          <Ionicons 
            name={showPassword ? "eye-off-outline" : "eye-outline"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: "", color: "#ddd" };
    if (password.length < 6) return { strength: 1, text: "Weak", color: "#FF3B30" };
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
    
    if (strength === 1) return { strength: 1, text: "Weak", color: "#FF3B30" };
    if (strength === 2) return { strength: 2, text: "Fair", color: "#FF9500" };
    if (strength === 3) return { strength: 3, text: "Good", color: "#007AFF" };
    return { strength: 4, text: "Strong", color: "#34C759" };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <TouchableOpacity 
          onPress={handleChangePassword}
          disabled={loading}
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Update</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
          <Text style={styles.securityText}>
            For security reasons, you&apos;ll be logged out of all other sessions after changing your password.
          </Text>
        </View>

        {/* Current Password */}
        <PasswordInput
          label="Current Password"
          value={formData.currentPassword}
          onChangeText={(text: string) => setFormData({ ...formData, currentPassword: text })}
          error={errors.currentPassword}
          showPassword={showCurrentPassword}
          onToggleVisibility={() => setShowCurrentPassword(!showCurrentPassword)}
          placeholder="Enter your current password"
        />

        {/* New Password */}
        <PasswordInput
          label="New Password"
          value={formData.newPassword}
          onChangeText={(text: string) => setFormData({ ...formData, newPassword: text })}
          error={errors.newPassword}
          showPassword={showNewPassword}
          onToggleVisibility={() => setShowNewPassword(!showNewPassword)}
          placeholder="Enter your new password"
        />

        {/* Password Strength Indicator */}
        {formData.newPassword.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBar}>
              {[1, 2, 3, 4].map((level) => (
                <View
                  key={level}
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor: level <= passwordStrength.strength ? passwordStrength.color : "#ddd",
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
              {passwordStrength.text}
            </Text>
          </View>
        )}

        {/* Password Requirements */}
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password must contain:</Text>
          <View style={styles.requirementItem}>
            <Ionicons 
              name={formData.newPassword.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={formData.newPassword.length >= 6 ? "#34C759" : "#666"} 
            />
            <Text style={styles.requirementText}>At least 6 characters</Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons 
              name={/[A-Z]/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={/[A-Z]/.test(formData.newPassword) ? "#34C759" : "#666"} 
            />
            <Text style={styles.requirementText}>One uppercase letter</Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons 
              name={/\d/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={/\d/.test(formData.newPassword) ? "#34C759" : "#666"} 
            />
            <Text style={styles.requirementText}>One number</Text>
          </View>
        </View>

        {/* Confirm New Password */}
        <PasswordInput
          label="Confirm New Password"
          value={formData.confirmPassword}
          onChangeText={(text: string) => setFormData({ ...formData, confirmPassword: text })}
          error={errors.confirmPassword}
          showPassword={showConfirmPassword}
          onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
          placeholder="Confirm your new password"
        />

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.changeButton, loading && styles.changeButtonDisabled]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.changeButtonText}>Change Password</Text>
          )}
        </TouchableOpacity>

        {/* Forgot Password */}
        <TouchableOpacity 
          style={styles.forgotPasswordButton}
          onPress={() => Alert.alert("Forgot Password", "This would open password recovery flow")}
        >
          <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  placeholder: {
    width: 60,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  securityInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f0f9ff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 30,
    gap: 12,
  },
  securityText: {
    flex: 1,
    color: "#007AFF",
    fontSize: 14,
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  eyeButton: {
    padding: 12,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    marginTop: 4,
  },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  strengthBar: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
    marginRight: 12,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "600",
  },
  requirementsContainer: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  changeButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  changeButtonDisabled: {
    backgroundColor: "#ccc",
  },
  changeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPasswordButton: {
    alignItems: "center",
    padding: 16,
    marginTop: 16,
  },
  forgotPasswordText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
});