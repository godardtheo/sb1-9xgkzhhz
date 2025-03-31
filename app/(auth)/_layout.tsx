import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth/store';

export default function AuthLayout() {
  const { session } = useAuthStore();
  const router = useRouter();

  // If user is already authenticated, redirect to home
  useEffect(() => {
    if (session) {
      console.log("Auth Layout: User is authenticated, redirecting to home");
      router.replace('/(tabs)');
    }
  }, [session, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ title: "Login" }} />
      <Stack.Screen name="signup" options={{ title: "Sign Up" }} />
    </Stack>
  );
}