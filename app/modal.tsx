import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ConfirmationModalProps {
  visible: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: "primary" | "danger" | "success";
}

const isIOS = Platform.OS === "ios";
const { width } = Dimensions.get("window");

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  variant = "primary",
}) => {
  // 🎨 Dynamic styles based on variant
  const getColors = (): readonly [string, string] => {
    switch (variant) {
      case "danger":
        return ["#EF4444", "#DC2626"];
      case "success":
        return ["#10B981", "#059669"];
      default:
        return ["#6366F1", "#4F46E5"];
    }
  };

  const getIcon = () => {
    switch (variant) {
      case "danger":
        return "warning";
      case "success":
        return "checkmark";
      default:
        return "help";
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
    >
      <BlurView
        intensity={isIOS ? 40 : 70}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onCancel}
        />

        {/* Modal */}
        <View style={styles.confirmModal}>
          {/* Icon */}
          <View style={styles.confirmIconWrapper}>
            <LinearGradient
              colors={getColors()}
              style={styles.confirmIconGradient}
            >
              <Ionicons name={getIcon()} size={30} color="#fff" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.confirmTitle}>{title}</Text>

          {/* Message */}
          <Text style={styles.confirmMessage}>{message}</Text>

          {/* Actions */}
          <View style={styles.confirmActions}>
            {/* Cancel */}
            <TouchableOpacity
              style={styles.confirmCancelBtn}
              onPress={onCancel}
            >
              <Text style={styles.confirmCancelText}>{cancelText}</Text>
            </TouchableOpacity>

            {/* Confirm */}
            <TouchableOpacity
              style={styles.confirmConfirmBtn}
              onPress={onConfirm}
              disabled={loading}
            >
              <LinearGradient
                colors={getColors()}
                style={styles.confirmConfirmGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmConfirmText}>{confirmText}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

export default ConfirmationModal;

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
  },

  confirmModal: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -width * 0.4 }, { translateY: -130 }],
    width: width * 0.8,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },

  confirmIconWrapper: {
    marginBottom: 16,
  },

  confirmIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  confirmTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },

  confirmMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },

  confirmActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },

  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },

  confirmCancelText: {
    color: "#6B7280",
    fontWeight: "600",
  },

  confirmConfirmBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
  },

  confirmConfirmGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },

  confirmConfirmText: {
    color: "#fff",
    fontWeight: "600",
  },
});
