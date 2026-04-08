import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info';

interface ModernToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

const TYPE_CONFIG = {
  success: { color: '#10B981', icon: '✅', label: 'Success' },
  error: { color: '#EF4444', icon: '❌', label: 'Error' },
  info: { color: '#3B82F6', icon: 'ℹ️', label: 'Note' },
};

export const ModernToast = ({ 
  visible, 
  message, 
  type = 'success', 
  onClose, 
  duration = 3000 
}: ModernToastProps) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance Animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 50, // Distance from top
          useNativeDriver: true,
          bounciness: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  if (!visible) return null;

  const config = TYPE_CONFIG[type];

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], opacity }
      ]}
    >
      <View style={[styles.toastCard, { borderLeftColor: config.color }]}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{config.icon}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{config.label}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastCard: {
    width: width * 0.9,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderLeftWidth: 6,
    // Modern Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
});