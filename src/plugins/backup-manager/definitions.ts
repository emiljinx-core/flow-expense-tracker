import { registerPlugin } from '@capacitor/core';

export interface BackupStatus {
  enabled: boolean;
  frequencyHours: number;
  lastBackupTimestamp: number;
  lastBackupError: string | null;
  lastBackupErrorTimestamp: number;
  backupCount: number;
  backupDirectory: string;
}

export interface BackupManagerPlugin {
  setAutoBackupEnabled(options: { enabled: boolean }): Promise<void>;
  isAutoBackupEnabled(): Promise<{ enabled: boolean }>;
  setBackupFrequency(options: { hours: number }): Promise<void>;
  getBackupFrequency(): Promise<{ hours: number }>;
  getBackupStatus(): Promise<BackupStatus>;
  triggerManualBackup(): Promise<void>;
}

const BackupManager = registerPlugin<BackupManagerPlugin>('BackupManager');

export * from './definitions';
export { BackupManager };
