import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { BackupManager, type BackupStatus } from '@/plugins/backup-manager/definitions';

export function useBackupManager() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    try {
      setLoading(true);
      const result = await BackupManager.getBackupStatus();
      setStatus(result);
      setError(null);
    } catch (err) {
      console.error('Failed to get backup status:', err);
      setError('Failed to get backup status');
    } finally {
      setLoading(false);
    }
  }, []);

  const setAutoBackupEnabled = useCallback(async (enabled: boolean) => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    try {
      await BackupManager.setAutoBackupEnabled({ enabled });
      await refreshStatus();
    } catch (err) {
      console.error('Failed to set auto backup enabled:', err);
      setError('Failed to set auto backup enabled');
    }
  }, [refreshStatus]);

  const setBackupFrequency = useCallback(async (hours: number) => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    try {
      await BackupManager.setBackupFrequency({ hours });
      await refreshStatus();
    } catch (err) {
      console.error('Failed to set backup frequency:', err);
      setError('Failed to set backup frequency');
    }
  }, [refreshStatus]);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      refreshStatus();
    }
  }, [refreshStatus]);

  return {
    status,
    loading,
    error,
    refreshStatus,
    setAutoBackupEnabled,
    setBackupFrequency,
    isNative: Capacitor.getPlatform() === 'android',
  };
}
