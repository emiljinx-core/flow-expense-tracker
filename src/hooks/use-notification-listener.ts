import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { NotificationListener, type TransactionCandidate } from '@/plugins/notification-listener/definitions';

export interface NotificationListenerState {
  permissionEnabled: boolean;
  isListening: boolean;
  overlayPermissionGranted: boolean;
  overlayEnabled: boolean;
  pendingTransactions: TransactionCandidate[];
  error: string | null;
}

export function useNotificationListener() {
  const [state, setState] = useState<NotificationListenerState>({
    permissionEnabled: false,
    isListening: false,
    overlayPermissionGranted: false,
    overlayEnabled: false,
    pendingTransactions: [],
    error: null,
  });

  const checkPermission = useCallback(async () => {
    try {
      const result = await NotificationListener.checkPermission();
      setState((prev) => ({ ...prev, permissionEnabled: result.enabled }));
      return result.enabled;
    } catch (error) {
      console.error('Failed to check permission:', error);
      setState((prev) => ({ ...prev, error: 'Failed to check permission' }));
      return false;
    }
  }, []);

  const openPermissionSettings = useCallback(async () => {
    try {
      await NotificationListener.openPermissionSettings();
      // Re-check permission after user returns from settings
      setTimeout(async () => {
        await checkPermission();
        await getPendingTransactions();
      }, 1000);
    } catch (error) {
      console.error('Failed to open permission settings:', error);
      setState((prev) => ({ ...prev, error: 'Failed to open permission settings' }));
    }
  }, [checkPermission]);

  const checkOverlayPermission = useCallback(async () => {
    try {
      const result = await NotificationListener.checkOverlayPermission();
      setState((prev) => ({ ...prev, overlayPermissionGranted: result.granted }));
      return result.granted;
    } catch (error) {
      console.error('Failed to check overlay permission:', error);
      setState((prev) => ({ ...prev, error: 'Failed to check overlay permission' }));
      return false;
    }
  }, []);

  const openOverlayPermissionSettings = useCallback(async () => {
    try {
      await NotificationListener.openOverlayPermissionSettings();
      // Re-check permission after user returns from settings
      setTimeout(async () => {
        await checkOverlayPermission();
        const enabled = await NotificationListener.isOverlayEnabled();
        setState((prev) => ({ ...prev, overlayEnabled: enabled.enabled }));
      }, 1000);
    } catch (error) {
      console.error('Failed to open overlay permission settings:', error);
      setState((prev) => ({ ...prev, error: 'Failed to open overlay permission settings' }));
    }
  }, [checkOverlayPermission]);

  const setOverlayEnabled = useCallback(async (enabled: boolean) => {
    try {
      // Check if permission is actually granted before enabling
      const granted = await checkOverlayPermission();
      if (!granted) {
        setState((prev) => ({ ...prev, error: 'Overlay permission not granted. Please enable it first.' }));
        return;
      }
      await NotificationListener.setOverlayEnabled({ enabled });
      setState((prev) => ({ ...prev, overlayEnabled: enabled, error: null }));
    } catch (error) {
      console.error('Failed to set overlay enabled:', error);
      setState((prev) => ({ ...prev, error: 'Failed to set overlay enabled' }));
    }
  }, [checkOverlayPermission]);

  const startListening = useCallback(async () => {
    try {
      // Check if permission is actually granted before starting
      const granted = await checkPermission();
      if (!granted) {
        setState((prev) => ({ ...prev, error: 'Notification permission not granted. Please enable it first.' }));
        return;
      }
      await NotificationListener.startListening();
      setState((prev) => ({ ...prev, isListening: true, error: null }));
    } catch (error) {
      console.error('Failed to start listening:', error);
      setState((prev) => ({ ...prev, error: 'Failed to start listening' }));
    }
  }, [checkPermission]);

  const stopListening = useCallback(async () => {
    try {
      await NotificationListener.stopListening();
      setState((prev) => ({ ...prev, isListening: false, error: null }));
    } catch (error) {
      console.error('Failed to stop listening:', error);
      setState((prev) => ({ ...prev, error: 'Failed to stop listening' }));
    }
  }, []);

  const clearPendingTransactions = useCallback(async () => {
    try {
      await NotificationListener.clearPendingTransactions();
      setState((prev) => ({ ...prev, pendingTransactions: [], error: null }));
    } catch (error) {
      console.error('Failed to clear pending transactions:', error);
      setState((prev) => ({ ...prev, error: 'Failed to clear pending transactions' }));
    }
  }, []);

  const getPendingTransactions = useCallback(async () => {
    try {
      const result = await NotificationListener.getPendingTransactions();
      setState((prev) => ({ ...prev, pendingTransactions: result, error: null }));
      return result;
    } catch (error) {
      console.error('Failed to get pending transactions:', error);
      setState((prev) => ({ ...prev, error: 'Failed to get pending transactions' }));
      return [];
    }
  }, []);

  useEffect(() => {
    // Only initialize on Android
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    // Check initial permission status
    checkPermission();
    checkOverlayPermission();
    getPendingTransactions();

    // Set up event listeners
    const listeners: { remove: () => void }[] = [];
    const setupListeners = async () => {
      const transactionListener = await NotificationListener.addListener('transactionDetected', (candidate: TransactionCandidate) => {
        console.log('Transaction detected:', candidate);
        setState((prev) => ({
          ...prev,
          pendingTransactions: [...prev.pendingTransactions, candidate],
          error: null,
        }));
      });
      listeners.push(transactionListener);

      const errorListener = await NotificationListener.addListener('serviceError', (error: string) => {
        console.error('Service error:', error);
        setState((prev) => ({ ...prev, error }));
      });
      listeners.push(errorListener);

      const statusListener = await NotificationListener.addListener('serviceStatus', (status: { listening: boolean; enabled: boolean }) => {
        console.log('Service status:', status);
        setState((prev) => ({
          ...prev,
          isListening: status.listening,
          permissionEnabled: status.enabled,
          error: null,
        }));
      });
      listeners.push(statusListener);
    };

    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      listeners.forEach(listener => listener.remove());
    };
  }, [checkPermission, checkOverlayPermission, getPendingTransactions]);

  return {
    ...state,
    checkPermission,
    openPermissionSettings,
    checkOverlayPermission,
    openOverlayPermissionSettings,
    setOverlayEnabled,
    startListening,
    stopListening,
    clearPendingTransactions,
    getPendingTransactions,
    isNative: Capacitor.getPlatform() === 'android',
  };
}
