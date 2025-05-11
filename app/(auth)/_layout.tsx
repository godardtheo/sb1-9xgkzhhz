import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/lib/auth/store';

export default function AuthLayout() {
  const { session, initialized, userProfile, isAppResuming, pendingModalPath } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    let navigationTimer: number | null = null;

    if (!initialized || isNavigating || isAppResuming || pendingModalPath) {
      if (pendingModalPath) {
        console.log(`[AuthLayout] Navigation BLOCKED due to pendingModalPath: ${pendingModalPath}`);
      }
      return;
    }
    
    const isAuthenticated = session && userProfile;
    const isInAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && isInAuthGroup) {
      setIsNavigating(true);
      console.log("Auth Layout: User is authenticated and in auth group (app not resuming), redirecting to home");
      
      navigationTimer = setTimeout(() => {
        try {
          router.replace('/(tabs)');
        } catch (error) {
          console.error('Auth layout navigation error:', error);
        } finally {
          // setIsNavigating(false);
        }
      }, 0);
    } else if (!isAuthenticated && !isInAuthGroup) {
      // Optionnel: si on n'est pas authentifié et pas dans le groupe auth,
      // on pourrait vouloir rediriger vers /login.
      // Mais RootLayout devrait déjà gérer ça. Pour l'instant, ne rien faire ici.
      // console.log("[AuthLayout] User not authenticated and not in auth group. RootLayout should handle redirection to login.");
    }

    return () => {
      if (navigationTimer) {
        clearTimeout(navigationTimer);
      }
    };
  }, [session, userProfile, router, initialized, isNavigating, segments, isAppResuming, pendingModalPath, setIsNavigating]);

  if (!initialized) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ title: "Login", animation: 'none' }} />
        <Stack.Screen name="signup" options={{ title: "Sign Up", animation: 'none' }} />
      </Stack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ title: "Login", animation: 'none' }} />
      <Stack.Screen name="signup" options={{ title: "Sign Up", animation: 'none' }} />
    </Stack>
  );
}