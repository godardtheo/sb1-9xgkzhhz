import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Platform, Keyboard, ViewStyle, TextStyle } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/lib/auth/store';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { Link } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const segments = useSegments();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Destructure what we need from auth store
  const { signIn, loading, session, userProfile, isAppResuming, pendingModalPath: authStorePendingModalPath } = useAuthStore();

  // Handle session changes to redirect when authenticated
  useEffect(() => {
    let navigationTimer: number | null = null; // Correct type for React Native

    if (isAppResuming || authStorePendingModalPath) {
      if (authStorePendingModalPath) {
        console.log(`[LoginScreen] Navigation BLOCKED due to authStorePendingModalPath: ${authStorePendingModalPath}`);
      }
      return;
    }

    // segments est de type string[]. ex: ['(auth)', 'login']
    const isCurrentlyOnAuthLoginRoute = segments[0] === '(auth)' && segments[1] === 'login';

    if (session && userProfile && isCurrentlyOnAuthLoginRoute) {
      console.log("Login: Session and profile detected on /login (app not resuming), redirecting to home (after 100ms delay)");
      navigationTimer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    }

    return () => {
      if (navigationTimer) {
        clearTimeout(navigationTimer);
      }
    };
  }, [session, userProfile, router, segments, isAppResuming, authStorePendingModalPath]);

  const handleLogin = async () => {
    try {
      setError(null);
      
      if (!email.trim()) {
        setError('Email is required');
        return;
      }
      
      if (!password) {
        setError('Password is required');
        return;
      }
      
      console.log('Signing in with:', email);
      await signIn(email, password);
      
      // Note: We don't need to navigate here, the useEffect will handle that
      // when the session state updates
      console.log('Sign in successful');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in');
    }
  };

  return (
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Mail size={20} color="#5eead4" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, Platform.OS === 'web' && styles.inputWeb]}
              placeholder="Email"
              placeholderTextColor="#5eead4"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color="#5eead4" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, Platform.OS === 'web' && styles.inputWeb]}
              placeholder="Password"
              placeholderTextColor="#5eead4"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
            />
          </View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <Pressable 
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#021a19" />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign In</Text>
                <ArrowRight size={20} color="#021a19" />
              </>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Link href="/signup" asChild>
              <Pressable>
                <Text style={styles.footerLink}>Sign up</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create<{
  container: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  form: ViewStyle;
  inputContainer: ViewStyle;
  inputIcon: ViewStyle;
  input: TextStyle;
  inputWeb: TextStyle;
  button: ViewStyle;
  buttonText: TextStyle;
  errorText: TextStyle;
  footer: ViewStyle;
  footerText: TextStyle;
  footerLink: TextStyle;
}>({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#115e59',
    borderRadius: 12,
    padding: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#ccfbf1',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    padding: 0,
  },
  inputWeb: {
    // @ts-ignore抑制ts(2322) react-native doesn't know outlineStyle but it works on web
    outlineStyle: 'none',
  },
  button: {
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#021a19',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  footerText: {
    color: '#5eead4',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  footerLink: {
    color: '#14b8a6',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});