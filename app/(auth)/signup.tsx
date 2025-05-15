import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Platform, Keyboard, ViewStyle, TextStyle, Linking } from 'react-native';
import { useRouter, Link, useSegments } from 'expo-router';
import { useAuthStore } from '@/lib/auth/store';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { Checkbox } from '@/components/Checkbox';

export default function SignupScreen() {
  const router = useRouter();
  const segments = useSegments();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signUp, loading, session, userProfile, isAppResuming, pendingModalPath: authStorePendingModalPath } = useAuthStore();

  // Handle session changes to redirect when authenticated
  useEffect(() => {
    let navigationTimer: number | null = null; // Correct type for React Native

    if (authStorePendingModalPath) {
      // console.log(`[SignupScreen] Navigation BLOCKED due to authStorePendingModalPath: ${authStorePendingModalPath}`);
      return;
    }

    const isCurrentlyOnAuthSignupRoute = segments[0] === '(auth)' && segments[1] === 'signup';

    if (session && userProfile && isCurrentlyOnAuthSignupRoute && !isAppResuming) {
      // console.log("Signup: Session and profile detected on /signup, app NOT resuming. Redirecting to home (after 100ms delay).");
      navigationTimer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    } else if (session && userProfile && isCurrentlyOnAuthSignupRoute && isAppResuming) {
      // console.log("Signup: Session and profile detected on /signup, BUT app IS resuming. Deferring redirection.");
    }

    return () => {
      if (navigationTimer) {
        clearTimeout(navigationTimer);
      }
    };
  }, [session, userProfile, router, segments, isAppResuming, authStorePendingModalPath]);

  const handleSignup = async () => {
    try {
      setError(null);
      
      if (!email.trim()) {
        setError('Email is required');
        return;
      }
      
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      if (!privacyConsent) {
        setError('You must agree to the privacy policy to create an account.');
        return;
      }
      
      await signUp(email, password);
      // Navigation happens in useEffect when session updates
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account');
    }
  };

  return (
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Sign up to start tracking your workouts</Text>
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
              textContentType="newPassword"
              autoComplete="password-new"
            />
          </View>

          {/* Privacy Consent Checkbox and Text */}
          <View style={styles.consentContainer}>
            <Checkbox
              checked={privacyConsent}
              onChange={setPrivacyConsent}
              size={20}
            />
            <View style={styles.consentTextContainer}>
              <Text style={styles.consentText}>
                I consent to SetLog collecting and processing my personal data. To learn more, you can consult our {' '}
                <Text 
                  style={styles.privacyLink}
                  onPress={() => Linking.openURL('https://opalescent-saxophone-7ec.notion.site/SetLog-Privacy-1f3c65959bb980b889fae00622a37fde?pvs=4')}
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>
          </View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <Pressable 
            style={[styles.button, (loading || !email.trim() || !password || !privacyConsent) && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading || !email.trim() || !password || !privacyConsent}
          >
            {loading ? (
              <ActivityIndicator color="#021a19" />
            ) : (
              <>
                <Text style={styles.buttonText}>Create Account</Text>
                <ArrowRight size={20} color="#021a19" />
              </>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/login" asChild>
              <Pressable>
                <Text style={styles.footerLink}>Sign in</Text>
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
  consentContainer: ViewStyle;
  consentTextContainer: ViewStyle;
  consentText: TextStyle;
  privacyLink: TextStyle;
  buttonDisabled: ViewStyle;
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
    // @ts-ignore react-native doesn't know outlineStyle but it works on web
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
  buttonDisabled: {
    backgroundColor: '#115e59',
    opacity: 0.7,
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
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  consentTextContainer: {
    flex: 1,
  },
  consentText: {
    color: '#ccfbf1',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  privacyLink: {
    color: '#14b8a6',
    textDecorationLine: 'underline',
    fontFamily: 'Inter-SemiBold',
  },
});