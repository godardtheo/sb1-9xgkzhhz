import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { ChevronRight, Mail, Star, Globe, LogOut, Bell, Shield, CircleHelp as HelpCircle, Gift } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth/store';
import LogoutConfirmationModal from '@/components/LogoutConfirmationModal';
import EditProfileModal from '@/components/EditProfileModal';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile, fetchUserProfile, signOut } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

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
      console.error('Logout error:', error);
      setLoading(false);
    }
  };

  const defaultAvatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop";

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <Image
              source={{ uri: userProfile?.avatar_url || defaultAvatarUrl }}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{userProfile?.full_name || 'Loading...'}</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {[
            { icon: Bell, label: 'Notifications', color: '#14b8a6' },
            { icon: Shield, label: 'Privacy', color: '#0d9488' },
            { icon: Mail, label: 'Support', color: '#0f766e' },
          ].map((item, index) => (
            <Pressable key={item.label} style={styles.menuItem}>
              <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                <item.icon size={20} color="#021a19" />
              </View>
              <Text style={styles.menuText}>{item.label}</Text>
              <ChevronRight size={20} color="#5eead4" />
            </Pressable>
          ))}
        </View>

        <View style={[styles.section, styles.sectionMargin]}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          {[
            { icon: Globe, label: 'Language & Units', color: '#14b8a6' },
            { icon: Star, label: 'Rate the App', color: '#0d9488' },
            { icon: Gift, label: 'Premium Features', color: '#0f766e' },
            { icon: HelpCircle, label: 'Help & FAQ', color: '#047857' },
          ].map((item, index) => (
            <Pressable key={item.label} style={styles.menuItem}>
              <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                <item.icon size={20} color="#021a19" />
              </View>
              <Text style={styles.menuText}>{item.label}</Text>
              <ChevronRight size={20} color="#5eead4" />
            </Pressable>
          ))}
        </View>

        <Pressable 
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
        >
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.version}>Version 1.0.0</Text>
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
  statsOverview: {
    flexDirection: 'row',
    backgroundColor: '#0d3d56',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#0f766e',
  },
  section: {
    padding: 24,
  },
  sectionMargin: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 16,
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3d56',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 24,
    marginTop: 8,
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
  version: {
    textAlign: 'center',
    color: '#5eead4',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 24,
    marginBottom: 32,
    opacity: 0.8,
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
});