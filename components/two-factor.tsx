import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get("window");
const isIOS = Platform.OS === 'ios';

interface TwoFactorModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  email: string;
  resendOTP?: () => Promise<void>;
}

export default function TwoFactorModal({
  visible,
  onClose,
  onVerify,
  email,
  resendOTP,
}: TwoFactorModalProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate modal entrance - scale from center
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Reset states when modal opens
      resetForm();
      startTimer();
      
    } else {
      // Reset animation when modal closes
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (visible && timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [visible, timer, canResend]);

  useEffect(() => {
    if(resendOTP)
      resendOTP();
  },[])

  const startTimer = () => {
    setTimer(60);
    setCanResend(false);
  };

  const resetForm = () => {
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setLoading(false);
    // Focus on first input
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all digits are filled
    if (index === 5 && text) {
      const fullOtp = [...newOtp.slice(0, 5), text].join("");
      if (fullOtp.length === 6) {
        handleVerify(fullOtp);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace to go to previous input
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpValue?: string) => {
    const finalOtp = otpValue || otp.join("");
    
    if (finalOtp.length !== 6) {
      setError("Please enter the 6-digit verification code");
      if (isIOS) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    try {
      setLoading(true);
      await onVerify(finalOtp);
      // Success is handled by parent component
      if (isIOS) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      setError("Invalid verification code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      if (isIOS) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    try {
      setResendLoading(true);
      if (resendOTP) {
        await resendOTP();
      }
      setError("");
      startTimer();
      if (isIOS) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      setError("Failed to resend code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const animatedModalStyle = {
    transform: [
      {
        scale: scaleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }),
      },
    ],
    opacity: fadeAnim,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <BlurView intensity={isIOS ? 80 : 100} style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={isIOS ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
            <View style={styles.modalContent}>
              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="shield-checkmark" size={48} color="#007AFF" />
                </View>
                <Text style={styles.title}>Two-Factor Authentication</Text>
                <Text style={styles.subtitle}>
                  Please enter the verification code sent to
                </Text>
                <Text style={styles.emailText}>{email}</Text>
              </View>

              {/* OTP Input Fields */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {inputRefs.current[index] = ref;}}
                    style={[
                      styles.otpInput,
                      error ? styles.otpInputError : null,
                      digit ? styles.otpInputFilled : null,
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    placeholder="•"
                    placeholderTextColor="#ccc"
                    editable={!loading}
                  />
                ))}
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
                onPress={() => handleVerify()}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              {/* Resend Section */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn&apos;t receive the code? </Text>
                {canResend ? (
                  <TouchableOpacity onPress={handleResendOTP} disabled={resendLoading}>
                    {resendLoading ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <Text style={styles.resendLink}>Resend Code</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.timerText}>Resend in {timer}s</Text>
                )}
              </View>

              {/* Help Text */}
              <View style={styles.helpContainer}>
                <Ionicons name="information-circle-outline" size={14} color="#999" />
                <Text style={styles.helpText}>
                  Check your spam folder if you don&apos;t see the email
                </Text>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: width - 40,
    maxWidth: 400,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 24,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    padding:10
  },
  otpInput: {
    width: 40,
    height: 52,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    backgroundColor: "#f8f9fa",
  },
  otpInputFilled: {
    borderColor: "#007AFF",
    backgroundColor: "#fff",
  },
  otpInputError: {
    borderColor: "#FF3B30",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE5E5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#FF3B30",
    fontWeight: "500",
  },
  verifyButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  resendText: {
    fontSize: 14,
    color: "#666",
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  timerText: {
    fontSize: 14,
    color: "#999",
  },
  helpContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  helpText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
});
