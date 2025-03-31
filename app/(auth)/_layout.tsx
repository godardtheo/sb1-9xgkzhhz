import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth/store';

export default function AuthLayout() {
  const { session, initialized } = useAuthStore();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  // If user is already authenticated, redirect to home
  useEffect(() => {
    if (!initialized || isNavigating) return;
    
    if (session) {
      setIsNavigating(true);
      console.log("Auth Layout: User is authenticated, redirecting to home");
      
      // Use setTimeout to ensure state updates happen before navigation
      setTimeout(() => {
        try {
          router.replace('/(tabs)');
        } catch (error) {
          console.error('Auth layout navigation error:', error);
        } finally {
          // Reset navigation state after a delay
          setTimeout(() => {
            setIsNavigating(false);
          }, 500);
        }
      }, 0);
    }
  }, [session, router, initialized, isNavigating]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ title: "Login" }} />
      <Stack.Screen name="signup" options={{ title: "Sign Up" }} />
    </Stack>
  );
}