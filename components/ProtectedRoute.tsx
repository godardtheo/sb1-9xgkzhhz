import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/lib/auth/store';
import { useRouter } from 'expo-router';

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, initialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if initialization is complete and there's no session
    if (initialized && !session) {
      // Use setTimeout to avoid navigation during render
      setTimeout(() => {
        router.replace('/login');
      }, 0);
    }
  }, [session, initialized, router]);

  // If still initializing, show loading screen
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#021a19' }}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  // If no session, don't render children (will redirect in useEffect)
  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: '#021a19' }} />
    );
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}