import { Capacitor } from '@capacitor/core';
import type { DataRepository } from './types';
import { SQLiteRepository } from './SQLiteRepository';
import { WebMockRepository } from './WebMockRepository';

let instance: DataRepository | null = null;

export function getRepository(): DataRepository {
  if (!instance) {
    if (Capacitor.isNativePlatform()) {
      instance = new SQLiteRepository();
    } else {
      instance = new WebMockRepository();
    }
  }
  return instance;
}
