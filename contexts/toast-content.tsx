import React, { createContext, useContext, useState, useCallback } from 'react';
import { ModernToast, ToastType } from '@/components/toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  isMarketVisible: boolean,
  setMarketVisible: (val: boolean) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as ToastType });
  const [isMarketVisible, setMarketVisible] = useState(false);
  

  

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ 
      showToast, 
      isMarketVisible,
      setMarketVisible,
    }}>

      {children}
      <ModernToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};