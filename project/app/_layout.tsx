import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthStore } from '@/lib/auth/store';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  useFrameworkReady();
  const initialize = useAuthStore(state => state.initialize);
  const initialized = useAuthStore(state => state.initialized);
  const session = useAuthStore(state => state.session);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    window.frameworkReady?.();
  }, []);

  if (!fontsLoaded || !initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#021a19' }}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        ) : (
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        )}
      </Stack>
      <StatusBar style="light" />
    </>
  );
}