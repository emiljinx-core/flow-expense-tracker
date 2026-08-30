import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface NotificationBridgePlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  openSettings(): Promise<void>;
  checkOverlayPermission(): Promise<{ granted: boolean }>;
  openOverlaySettings(): Promise<void>;
  syncPending(): Promise<void>;
  syncSaved(): Promise<{ transactions: any[] }>;
  acknowledge(options: { ids: string[] }): Promise<void>;
  scheduleBackup(options: { frequencyHours: number }): Promise<void>;
  cancelBackup(): Promise<void>;
  
  addListener(
    eventName: 'onPendingTransactions',
    listenerFunc: (event: { transactions: any[] }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

const NotificationBridge = registerPlugin<NotificationBridgePlugin>('NotificationBridge');

export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const { granted } = await NotificationBridge.checkPermission();
    return granted;
  } catch (e) {
    console.error('Failed to check notification permission', e);
    return false;
  }
}

export async function openNotificationSettings(): Promise<void> {
  try {
    await NotificationBridge.openSettings();
  } catch (e) {
    console.error('Failed to open notification settings', e);
  }
}

export async function checkOverlayPermission(): Promise<boolean> {
  try {
    const { granted } = await NotificationBridge.checkOverlayPermission();
    return granted;
  } catch (e) {
    console.error('Failed to check overlay permission', e);
    return false;
  }
}

export async function openOverlaySettings(): Promise<void> {
  try {
    await NotificationBridge.openOverlaySettings();
  } catch (e) {
    console.error('Failed to open overlay settings', e);
  }
}

export async function syncPendingTransactions(): Promise<void> {
  try {
    await NotificationBridge.syncPending();
  } catch (e) {
    console.error('Failed to sync pending transactions', e);
  }
}

export async function syncSavedTransactions(): Promise<any[]> {
  try {
    const res = await NotificationBridge.syncSaved();
    return res.transactions || [];
  } catch (e) {
    console.error('Failed to sync saved transactions', e);
    return [];
  }
}

export async function acknowledgeTransactions(ids: string[]): Promise<void> {
  try {
    await NotificationBridge.acknowledge({ ids });
  } catch (e) {
    console.error('Failed to acknowledge transactions', e);
  }
}

export function onPendingTransactions(callback: (transactions: any[]) => void): Promise<PluginListenerHandle> {
  return NotificationBridge.addListener('onPendingTransactions', (event: any) => {
    callback(event.transactions || []);
  });
}
