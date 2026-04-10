import { useState, useCallback } from 'react';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

export type ConfirmationType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface ConfirmationOptions {
  title: string;
  message: string;
  type?: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
}

const getTypeConfig = (type: ConfirmationType) => {
  switch (type) {
    case 'danger':
      return {
        gradientColors: ['#EF4444', '#DC2626'] as const,
        icon: 'alert-triangle' as keyof typeof Ionicons.glyphMap,
        iconBg: '#FEE2E2',
      };
    case 'warning':
      return {
        gradientColors: ['#F59E0B', '#D97706'] as const,
        icon: 'warning' as keyof typeof Ionicons.glyphMap,
        iconBg: '#FEF3C7',
      };
    case 'success':
      return {
        gradientColors: ['#10B981', '#059669'] as const,
        icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
        iconBg: '#D1FAE5',
      };
    case 'info':
    default:
      return {
        gradientColors: ['#3B82F6', '#2563EB'] as const,
        icon: 'information-circle' as keyof typeof Ionicons.glyphMap,
        iconBg: '#DBEAFE',
      };
  }
};

export default function ConfirmationModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  type = 'danger',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  icon,
}: ConfirmationModalProps) {
  const typeConfig = getTypeConfig(type);
  const displayIcon = icon || typeConfig.icon;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <BlurView intensity={isIOS ? 40 : 70} tint="dark" style={StyleSheet.absoluteFillObject}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.confirmModalContent}>
          {/* Icon Container */}
          <View style={[styles.confirmIconContainer, { backgroundColor: typeConfig.iconBg }]}>
            <LinearGradient
              colors={typeConfig.gradientColors}
              style={styles.confirmIconGradient}
            >
              <Ionicons name={displayIcon} size={32} color="#fff" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.confirmTitle}>{title}</Text>

          {/* Message */}
          <Text style={styles.confirmText}>{message}</Text>

          {/* Buttons */}
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              disabled={loading}
            >
              <LinearGradient
                colors={typeConfig.gradientColors}
                style={styles.confirmButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>{confirmText}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

export function useConfirmation() {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [loading, setLoading] = useState(false);

  const showConfirmation = useCallback((opts: ConfirmationOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const hideConfirmation = useCallback(() => {
    setVisible(false);
    setOptions(null);
    setLoading(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!options) return;
    
    setLoading(true);
    try {
      await options.onConfirm();
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setLoading(false);
      hideConfirmation();
    }
  }, [options, hideConfirmation]);

  const ConfirmationModalComponent = useCallback(() => {
    if (!options) return null;
    
    return (
      <ConfirmationModal
        visible={visible}
        onClose={hideConfirmation}
        onConfirm={handleConfirm}
        title={options.title}
        message={options.message}
        type={options.type || 'danger'}
        confirmText={options.confirmText || 'Confirm'}
        cancelText={options.cancelText || 'Cancel'}
        loading={loading}
      />
    );
  }, [visible, options, hideConfirmation, handleConfirm, loading]);

  return {
    showConfirmation,
    ConfirmationModal: ConfirmationModalComponent,
  };
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
  },
  confirmModalContent: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -width * 0.4 }, { translateY: -120 }],
    width: width * 0.8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  confirmIconContainer: {
    marginBottom: 16,
    borderRadius: 40,
    padding: 4,
  },
  confirmIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});