import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { ChevronRight, Mail, Globe, LogOut, Shield, HelpCircle, Menu, Trash2 } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth/store';
import { supabase } from '@/lib/supabase';
import LogoutConfirmationModal from '@/components/LogoutConfirmationModal';
import EditProfileModal from '@/components/EditProfileModal';
import HelpFAQModal from '@/components/HelpFAQModal';
import PrivacyModal from '@/components/PrivacyModal';
import TermsAndConditionsModal from '@/components/TermsAndConditionsModal';
import Animated, { FadeIn } from 'react-native-reanimated';

// Get app version from app.json
const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile, fetchUserProfile, signOut } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHelpFAQModal, setShowHelpFAQModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  // Preferences states
  const [notifications, setNotifications] = useState<'yes' | 'no'>('no');
  const [units, setUnits] = useState<'kg' | 'lb'>('kg');
  const [language, setLanguage] = useState('English');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  useEffect(() => {
    // Ensure we have the latest user profile data
    if (!userProfile) {
      fetchUserProfile();
    }
  }, [fetchUserProfile, userProfile]);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut();
      setShowLogoutModal(false);
      setShowSuccessMessage(true);
      
      setTimeout(() => {
        router.replace('/login');
      }, 1500);
    } catch (error) {
      if (process.env.EXPO_PUBLIC_ENV !== 'production') {
        console.error('Logout error:', error);
      }
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Get the current user from the store at the moment of the call
    const user = useAuthStore.getState().session?.user;

    // Log le user object et user.id pour debug
    if (process.env.EXPO_PUBLIC_ENV !== 'production') {
      console.log('[handleDeleteAccount] User object from store:', JSON.stringify(user, null, 2));
    }
    if (user) {
      if (process.env.EXPO_PUBLIC_ENV !== 'production') {
        console.log('[handleDeleteAccount] User ID:', user.id);
      }
    } else {
      if (process.env.EXPO_PUBLIC_ENV !== 'production') {
        console.log('[handleDeleteAccount] User object is null or undefined.');
      }
    }

    if (user && user.id) {
      Alert.alert(
        "Delete my account",
        "You are about to delete your account. This action is irreversible and can't be undone. All your data will be erased. Are you sure?",
        [
          {
            text: "No",
            style: "cancel",
            onPress: () => setIsDeletingAccount(false),
          },
          {
            text: "Yes",
            style: "destructive",
            onPress: async () => {
              setIsDeletingAccount(true);
              try {
                // Ensure user.id is being passed in the body
                if (process.env.EXPO_PUBLIC_ENV !== 'production') {
                  console.log(`[handleDeleteAccount] Invoking delete-user-account with userId: ${user.id}`);
                }
                const { data, error } = await supabase.functions.invoke(
                  'delete-user-account',
                  { body: { userId: user.id } } // Pass userId in the body
                );

                if (error) {
                  let errorMessage = error.message;
                  // Attempt to get more specific error message from Supabase function error context
                  if ((error.context as any)?.error_message) {
                    errorMessage = (error.context as any).error_message;
                  } else if (data && (data as any).error) {
                    errorMessage = (data as any).error;
                  }
                  if (process.env.EXPO_PUBLIC_ENV !== 'production') {
                    console.error('[handleDeleteAccount] Error from delete-user-account function:', errorMessage);
                  }
                  throw new Error(errorMessage);
                }

                // Check if the function itself signaled an error in its JSON response
                if (data && (data as any).error) {
                  if (process.env.EXPO_PUBLIC_ENV !== 'production') {
                    console.error('[handleDeleteAccount] Error in function data response:', (data as any).error);
                  }
                  throw new Error((data as any).error);
                }
                
                if (process.env.EXPO_PUBLIC_ENV !== 'production') {
                  console.log('[handleDeleteAccount] Account deletion successful on server-side.');
                }
                // Force sign out on client side AFTER successful server-side deletion
                await signOut(); 

                Alert.alert("Account Deleted", "Your account has been successfully deleted.");
                router.replace('/login'); 

              } catch (error: any) {
                if (process.env.EXPO_PUBLIC_ENV !== 'production') {
                  console.error('[handleDeleteAccount] Catch block error:', error.message);
                }
                Alert.alert("Error", error.message || "An unexpected error occurred while deleting your account.");
              } finally {
                setIsDeletingAccount(false);
              }
            }
          }
        ],
        { cancelable: true, onDismiss: () => setIsDeletingAccount(false) }
      );
    } else {
      if (process.env.EXPO_PUBLIC_ENV !== 'production') {
        console.error('[handleDeleteAccount] User or User ID is undefined. Cannot proceed with account deletion.');
      }
      Alert.alert("Error", "Could not delete account. User information is missing or you are not properly signed in.");
      setIsDeletingAccount(false); // Reset loading state if any
    }
  };

  const defaultAvatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop";

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            {/* <Image
              source={{ uri: userProfile?.avatar_url || defaultAvatarUrl }}
              style={styles.avatar}
            /> */}
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{userProfile?.username|| 'Loading...'}</Text>
              <Text style={styles.email}>{userProfile?.email || 'Loading...'}</Text>
            </View>
          </View>
          <Pressable 
            style={styles.editButton}
            onPress={() => setShowEditModal(true)}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          {/* Notifications */}
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Notifications</Text>
            <View style={styles.radioGroup}>
              <Pressable 
                style={[styles.radioButton, notifications === 'yes' && styles.radioButtonSelected]}
                onPress={() => setNotifications('yes')}
              >
                <View style={[styles.radioCircle, notifications === 'yes' && styles.radioCircleSelected]} />
                <Text style={styles.radioLabel}>Yes</Text>
              </Pressable>
              <Pressable 
                style={[styles.radioButton, notifications === 'no' && styles.radioButtonSelected]}
                onPress={() => setNotifications('no')}
              >
                <View style={[styles.radioCircle, notifications === 'no' && styles.radioCircleSelected]} />
                <Text style={styles.radioLabel}>No</Text>
              </Pressable>
            </View>
          </View>
          
          {/* Language */}
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Language</Text>
            <Pressable 
              style={styles.dropdown}
              onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
            >
              <Text style={styles.dropdownText}>{language}</Text>
              <ChevronRight size={20} color="#5eead4" style={{ transform: [{ rotate: showLanguageDropdown ? '90deg' : '0deg' }] }} />
            </Pressable>
            {showLanguageDropdown && (
              <Animated.View 
                style={styles.dropdownMenu}
                entering={FadeIn.duration(200)}
              >
                <Pressable 
                  style={[styles.dropdownItem, language === 'English' && styles.dropdownItemSelected]}
                  onPress={() => {
                    setLanguage('English');
                    setShowLanguageDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>English</Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
          
          {/* Units */}
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Units</Text>
            <View style={styles.radioGroup}>
              <Pressable 
                style={[styles.radioButton, units === 'kg' && styles.radioButtonSelected]}
                onPress={() => setUnits('kg')}
              >
                <View style={[styles.radioCircle, units === 'kg' && styles.radioCircleSelected]} />
                <Text style={styles.radioLabel}>kg</Text>
              </Pressable>
              {/* Radio button for pounds (lb) unit selection 
              <Pressable 
                style={[styles.radioButton, units === 'lb' && styles.radioButtonSelected]}
                onPress={() => setUnits('lb')}
              >
                <View style={[styles.radioCircle, units === 'lb' && styles.radioCircleSelected]} />
                <Text style={styles.radioLabel}>lb</Text>
              </Pressable>*/}
              
            </View>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Info</Text>
          
          {/* Help & FAQ */}
          <Pressable 
            style={styles.menuItem}
            onPress={() => setShowHelpFAQModal(true)}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#14b8a6' }]}>
              <HelpCircle size={20} color="#021a19" />
            </View>
            <Text style={styles.menuText}>Help & FAQ</Text>
            <ChevronRight size={20} color="#5eead4" />
          </Pressable>
          
          {/* Privacy */}
          <Pressable 
            style={styles.menuItem}
            onPress={() => setShowPrivacyModal(true)}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#0d9488' }]}>
              <Shield size={20} color="#021a19" />
            </View>
            <Text style={styles.menuText}>Privacy</Text>
            <ChevronRight size={20} color="#5eead4" />
          </Pressable>
          
          {/* Terms and Conditions */}
          <Pressable 
            style={styles.menuItem}
            onPress={() => setShowTermsModal(true)}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#0f766e' }]}>
              <Menu size={20} color="#021a19" />
            </View>
            <Text style={styles.menuText}>Terms and Conditions</Text>
            <ChevronRight size={20} color="#5eead4" />
          </Pressable>
          
          {/* Contact and Version */}
          <View style={styles.contactSection}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Contact:</Text>
              <Text style={styles.infoValue}>contact@setlog.com</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Version:</Text>
              <Text style={styles.infoValue}>{APP_VERSION}</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable 
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
        >
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        {/* Delete Account Button */}
        {isDeletingAccount ? (
          <ActivityIndicator size="large" color="#ef4444" style={styles.deleteLoader} />
        ) : (
          <Pressable 
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
          >
            <Trash2 size={20} color="#ef4444" />
            <Text style={styles.deleteAccountButtonText}>Delete My Account</Text>
          </Pressable>
        )}
      </ScrollView>

      {showSuccessMessage && (
        <Animated.View 
          style={styles.successMessage}
          entering={FadeIn.duration(200)}
        >
          <Text style={styles.successText}>Successfully logged out</Text>
        </Animated.View>
      )}

      <LogoutConfirmationModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        loading={loading}
      />

      {userProfile && (
        <EditProfileModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          userData={userProfile}
          onUpdate={fetchUserProfile}
        />
      )}

      <HelpFAQModal
        visible={showHelpFAQModal}
        onClose={() => setShowHelpFAQModal(false)}
      />

      <PrivacyModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      <TermsAndConditionsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 100, // Add extra padding at the bottom
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
  },
  profileSection: {
    padding: 24,
    backgroundColor: '#0d3d56',
    marginHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#14b8a6',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  editButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#021a19',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  section: {
    padding: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 16,
  },
  preferenceRow: {
    marginBottom: 20,
  },
  preferenceLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ccfbf1',
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#115e59',
  },
  radioButtonSelected: {
    backgroundColor: '#0f766e',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#5eead4',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    backgroundColor: '#14b8a6',
  },
  radioLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#115e59',
    borderRadius: 12,
    padding: 12,
  },
  dropdownText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  dropdownMenu: {
    backgroundColor: '#115e59',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    position: 'absolute',
    top: 76, // Position below the dropdown button
    left: 0,
    right: 0,
    zIndex: 10,
  },
  dropdownItem: {
    padding: 12,
  },
  dropdownItemSelected: {
    backgroundColor: '#0f766e',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d3d56',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ccfbf1',
  },
  contactSection: {
    marginTop: 16,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ccfbf1',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3d56',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  successMessage: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -25 }],
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  successText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 24,
  },
  deleteAccountButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  deleteLoader: {
    marginTop: 24,
    marginBottom: 32,
  }
});