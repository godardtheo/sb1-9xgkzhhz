import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Simple storage adapter that works in both browser and server environments
 * Focuses on reliability with basic error handling
 */
class SimpleStorageAdapter {
  private inMemoryStore: Record<string, string> = {};
  private readonly isServer: boolean;

  constructor() {
    // Check if we're in a server environment
    this.isServer = typeof window === 'undefined';
  }

  /**
   * Get an item from storage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      // In server environment, just use memory
      if (this.isServer) {
        return this.inMemoryStore[key] || null;
      }

      // Try to get from AsyncStorage
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from storage:', error);
      // Fall back to in-memory if available
      return this.inMemoryStore[key] || null;
    }
  }

  /**
   * Set an item in storage
   */
  async setItem(key: string, value: string): Promise<void> {
    // Always update in-memory store
    this.inMemoryStore[key] = value;

    // In server environment, we're done
    if (this.isServer) {
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in storage:', error);
      // At least we have it in memory
    }
  }

  /**
   * Remove an item from storage
   */
  async removeItem(key: string): Promise<void> {
    // Always remove from in-memory store
    delete this.inMemoryStore[key];

    // In server environment, we're done
    if (this.isServer) {
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  }
}

export const storageAdapter = new SimpleStorageAdapter();
