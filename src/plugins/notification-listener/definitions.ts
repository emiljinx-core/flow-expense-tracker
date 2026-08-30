import { registerPlugin } from '@capacitor/core';

export interface TransactionCandidate {
  id: string;
  type: 'debit' | 'credit';
  amount: number;
  counterparty: string | null;
  detectedAt: string;
  sourceApp: string;
  suggestedCategory?: string;
  suggestedDescription?: string;
  raw: string;
}

export interface NotificationListenerPlugin {
  checkPermission(): Promise<{ enabled: boolean }>;
  openPermissionSettings(): Promise<void>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  isListening(): Promise<{ listening: boolean }>;
  clearPendingTransactions(): Promise<void>;
  getPendingTransactions(): Promise<TransactionCandidate[]>;
  checkOverlayPermission(): Promise<{ granted: boolean }>;
  openOverlayPermissionSettings(): Promise<void>;
  setOverlayEnabled(options: { enabled: boolean }): Promise<void>;
  isOverlayEnabled(): Promise<{ enabled: boolean }>;

  addListener(eventName: 'transactionDetected', listenerFunc: (candidate: TransactionCandidate) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'serviceError', listenerFunc: (error: string) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'serviceStatus', listenerFunc: (status: { listening: boolean; enabled: boolean }) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

export interface PluginListenerHandle {
  remove: () => void;
}

const NotificationListener = registerPlugin<NotificationListenerPlugin>('NotificationListener');

export * from './definitions';
export { NotificationListener };
