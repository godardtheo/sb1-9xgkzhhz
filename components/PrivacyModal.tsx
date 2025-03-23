import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import InfoModal from './InfoModal';

type PrivacyModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function PrivacyModal({ visible, onClose }: PrivacyModalProps) {
  return (
    <InfoModal
      visible={visible}
      onClose={onClose}
      title="Privacy Policy"
    >
      <View style={styles.section}>
        <Text style={styles.lastUpdated}>Last Updated: March, 2025</Text>
        <Text style={styles.paragraph}>
          At SetLog, we take your privacy seriously. This Privacy Policy describes how we collect, use, 
          and share your personal information when you use our mobile application.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Information We Collect</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.boldText}>Account Information: </Text>
          When you register, we collect your email address and any profile information you choose to provide.
        </Text>
        
        <Text style={styles.paragraph}>
          <Text style={styles.boldText}>Workout Data: </Text>
          We collect information about your workouts, exercise routines, and progress tracking data.
        </Text>
        
        <Text style={styles.paragraph}>
          <Text style={styles.boldText}>Device Information: </Text>
          We collect information about your device, including operating system version and device identifiers.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use your information to provide and improve our services, including:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Providing and maintaining the app</Text>
          <Text style={styles.bulletItem}>• Creating and managing your account</Text>
          <Text style={styles.bulletItem}>• Tracking your workout progress</Text>
          <Text style={styles.bulletItem}>• Sending you notifications (with your permission)</Text>
          <Text style={styles.bulletItem}>• Improving our services</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Storage</Text>
        <Text style={styles.paragraph}>
          Your data is stored securely using industry-standard encryption. We use Supabase for our database infrastructure.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal information. We may share data with service providers who help us deliver our services,
          but they are obligated to protect your information.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Rights</Text>
        <Text style={styles.paragraph}>
          You have the right to access, correct, or delete your personal information. You can do this through the app settings
          or by contacting us.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy, please contact us at:
        </Text>
        <Text style={styles.contactEmail}>contact@setlog.com</Text>
      </View>
    </InfoModal>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  lastUpdated: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    marginBottom: 12,
    lineHeight: 20,
  },
  boldText: {
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  bulletList: {
    marginLeft: 8,
    marginTop: 8,
  },
  bulletItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    marginBottom: 8,
    lineHeight: 20,
  },
  contactEmail: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#14b8a6',
  },
});