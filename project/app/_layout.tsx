import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthStore } from '@/lib/auth/store';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  useFrameworkReady();
  const initialize = useAuthStore(state => state.initialize);
  const initialized = useAuthStore(state => state.initialized);
  const session = useAuthStore(state => state.session);
  const [authError, setAuthError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        setAuthError(null);
        await initialize();
      } catch (error) {
        console.error('Error initializing auth:', error);
        setAuthError('Could not initialize authentication. Please try again.');
      }
    };

    initAuth();
  }, [initialize]);

  // Show loading screen while fonts and auth initialize
  if (!fontsLoaded || !initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#021a19' }}>
        <ActivityIndicator size="large" color="#14b8a6" />
        {authError && (
          <Text style={{ color: '#ef4444', marginTop: 16, textAlign: 'center', paddingHorizontal: 32 }}>
            {authError}
          </Text>
        )}
      </View>
    );
  }

  // Render the appropriate layout based on auth state
  return (
    <GestureHandlerRootView style={styles.container}>
      <>
        {!session ? (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          </Stack>
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          </Stack>
        )}
        <StatusBar style="light" />
      </>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});