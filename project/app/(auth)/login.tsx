import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Platform, Modal } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuthStore } from '@/lib/auth/store';
import { Mail, Lock, ArrowRight, CircleAlert as AlertCircle, Circle as XCircle } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type ErrorType = 'invalid_credentials' | 'network_error' | 'server_error' | 'validation_error' | null;

interface ErrorDetails {
  type: ErrorType;
  message: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const { signIn, loading } = useAuthStore();

  // Clear error when inputs change
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [email, password]);

  const validateInputs = (): boolean => {
    if (!email.trim()) {
      setError({
        type: 'validation_error',
        message: 'Email is required'
      });
      return false;
    }

    if (!email.includes('@')) {
      setError({
        type: 'validation_error',
        message: 'Please enter a valid email address'
      });
      return false;
    }

    if (!password.trim()) {
      setError({
        type: 'validation_error',
        message: 'Password is required'
      });
      return false;
    }

    if (password.length < 6) {
      setError({
        type: 'validation_error',
        message: 'Password must be at least 6 characters'
      });
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    try {
      if (!validateInputs()) {
        setShowErrorModal(true);
        return;
      }

      const { data, error: signInError } = await signIn(email, password);
      
      if (signInError) {
        let errorDetails: ErrorDetails;
        
        if (signInError.message?.includes('Invalid login credentials')) {
          errorDetails = {
            type: 'invalid_credentials',
            message: 'Invalid email or password'
          };
        } else if (signInError.message?.includes('network')) {
          errorDetails = {
            type: 'network_error',
            message: 'Unable to connect. Please check your internet connection.'
          };
        } else {
          errorDetails = {
            type: 'server_error',
            message: 'An unexpected error occurred. Please try again later.'
          };
        }
        
        setError(errorDetails);
        setShowErrorModal(true);
        return;
      }

      if (data?.session) {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError({
        type: 'server_error',
        message: 'An unexpected error occurred. Please try again later.'
      });
      setShowErrorModal(true);
    }
  };

  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case 'invalid_credentials':
        return <XCircle size={32} color="#ef4444" />;
      case 'network_error':
        return <AlertCircle size={32} color="#f59e0b" />;
      default:
        return <AlertCircle size={32} color="#ef4444" />;
    }
  };

  return (
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
            editable={!loading}
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
            editable={!loading}
          />
        </View>

        <Pressable 
          style={[styles.button, loading && styles.buttonDisabled]}
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

      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={styles.modalContent}
            entering={FadeIn.duration(200)}
          >
            {error && (
              <>
                <View style={styles.modalIcon}>
                  {getErrorIcon(error.type)}
                </View>
                <Text style={styles.modalTitle}>
                  {error.type === 'invalid_credentials' ? 'Login Failed' : 'Error'}
                </Text>
                <Text style={styles.modalMessage}>{error.message}</Text>
                <Pressable 
                  style={styles.modalButton}
                  onPress={() => setShowErrorModal(false)}
                >
                  <Text style={styles.modalButtonText}>Try Again</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    opacity: 0.7,
  },
  buttonText: {
    color: '#021a19',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 26, 25, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#14b8a6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#021a19',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});