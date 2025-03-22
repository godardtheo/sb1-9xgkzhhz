import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Custom storage adapter that works in both browser and server environments
 * In server environments (where window is undefined), it uses an in-memory store
 */
class CustomStorageAdapter {
  private inMemoryStore: Record<string, string> = {};
  private isServer: boolean;

  constructor() {
    // Check if we're in a server environment
    this.isServer = typeof window === 'undefined';
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isServer) {
        return this.inMemoryStore[key] || null;
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isServer) {
        this.inMemoryStore[key] = value;
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (this.isServer) {
        delete this.inMemoryStore[key];
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  }
}

export const storageAdapter = new CustomStorageAdapter();