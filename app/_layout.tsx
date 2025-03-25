import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthStore } from '@/lib/auth/store';
import { View, ActivityIndicator, Text } from 'react-native';

export default function RootLayout() {
  useFrameworkReady();
  const initialize = useAuthStore(state => state.initialize);
  const initialized = useAuthStore(state => state.initialized);
  const session = useAuthStore(state => state.session);
  const loading = useAuthStore(state => state.loading);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    // Initialize authentication when app starts
    initialize();
  }, [initialize]);

  useEffect(() => {
    // For Bolt.new framework - safely check for window existence
    if (typeof window !== 'undefined' && window.frameworkReady) {
      window.frameworkReady();
    }
  }, []);

  // Show loading screen while fonts are loading or auth is initializing
  if (!fontsLoaded || !initialized || loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#021a19' 
      }}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={{ 
          marginTop: 12,
          color: '#5eead4',
          fontFamily: 'system-font',
          fontSize: 14
        }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        ) : (
          <>
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="workout" options={{ animation: 'slide_from_right' }} />
          </>
        )}
      </Stack>
      <StatusBar style="light" />
    </>
  );
}