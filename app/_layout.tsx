import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthStore } from '@/lib/auth/store';
import { View, ActivityIndicator, Text, AppState, Platform } from 'react-native';

export default function RootLayout() {
  useFrameworkReady();
  const { initialize, initialized, session, loading, refreshSession } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const [appState, setAppState] = useState(AppState.currentState);
  const [isNavigating, setIsNavigating] = useState(false);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  
  // Initialize authentication when app starts
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!initialized || isNavigating) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    const shouldRedirectToHome = session && inAuthGroup;
    const shouldRedirectToLogin = !session && !inAuthGroup;
    
    // Don't navigate if we're already on the correct screen
    if (!shouldRedirectToHome && !shouldRedirectToLogin) return;
    
    // Set navigating state to prevent navigation loops
    setIsNavigating(true);
    
    // Use setTimeout to ensure state updates happen before navigation
    setTimeout(() => {
      try {
        if (shouldRedirectToHome) {
          console.log('Layout: User is authenticated but on auth screen, redirecting to home');
          router.replace('/(tabs)');
        } else if (shouldRedirectToLogin) {
          console.log('Layout: User is not authenticated and not on auth screen, redirecting to login');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Navigation error:', error);
      } finally {
        // Reset navigation state after a delay to allow navigation to complete
        setTimeout(() => {
          setIsNavigating(false);
        }, 500);
      }
    }, 0);
  }, [session, initialized, segments, router, isNavigating]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const wasInactive = appState.match(/inactive|background/);
      const isActive = nextAppState === 'active';
      
      if (wasInactive && isActive) {
        console.log('App has come to the foreground!');
        
        // When coming back to the app, refresh the session
        if (session) {
          refreshSession().catch(err => {
            console.warn('Failed to refresh session on foreground:', err);
          });
        }
      }
      
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, session, refreshSession]);

  // For Bolt.new framework support
  useEffect(() => {
    if (typeof window !== 'undefined' && window.frameworkReady) {
      window.frameworkReady();
    }
  }, []);

  // Show loading screen while fonts are loading or auth is initializing
  if (!fontsLoaded || !initialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#021a19',
        }}
      >
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text
          style={{
            marginTop: 12,
            color: '#5eead4',
            fontFamily: 'system-font',
            fontSize: 14,
          }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="(auth)" 
          options={{ 
            animation: 'fade',
          }}
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="modals"
          options={{ 
            animation: 'slide_from_right',
            presentation: 'modal',
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}