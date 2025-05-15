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
        <Text style={styles.lastUpdated}>Last updated: May 14, 2025</Text>
        <Text style={styles.paragraph}>
          SetLog (“we”, “us”, or “our”) is committed to protecting your personal data and respecting your privacy in accordance with the General Data Protection Regulation (EU) 2016/679 (“GDPR”). This Privacy Policy explains how we collect, use, store, and protect your data when you use the SetLog mobile application.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Who We Are</Text>
        <Text style={styles.paragraph}>
          SetLog is a mobile application that allows users to track their performance and progress in strength training. Users can create workout programs, log training results, and browse an exercise library.
        </Text>
        <Text style={styles.paragraph}>
          📧 <Text style={styles.boldText}>Contact:</Text> <Text style={styles.contactEmail}>godardtheopro@gmail.com</Text>
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. What Personal Data We Collect</Text>
        <Text style={styles.paragraph}>
          We collect the following personal information:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Full name (first and last)</Text>
          <Text style={styles.bulletItem}>• Email address</Text>
          <Text style={styles.bulletItem}>• Gender</Text>
          <Text style={styles.bulletItem}>• Height and weight</Text>
          <Text style={styles.bulletItem}>• Avatar (planned for future updates)</Text>
        </View>
        <Text style={styles.paragraph}>
          This data is collected when you create an account and use the application.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Why We Collect Your Data</Text>
        <Text style={styles.paragraph}>
          We collect and process your data to:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Create and manage your user account</Text>
          <Text style={styles.bulletItem}>• Track your fitness and training progress</Text>
          <Text style={styles.bulletItem}>• Enable personalized training logs and features</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Legal Basis for Processing</Text>
        <Text style={styles.paragraph}>
          We process your personal data based on:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>
            • <Text style={styles.boldText}>Your explicit consent</Text> – You must check a consent box when signing up. Without consent, account creation is not possible.
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.boldText}>Performance of a contract</Text> – We require your data to provide our core features.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. How Long We Keep Your Data</Text>
        <Text style={styles.paragraph}>
          We retain your data as long as your account is active. If you delete your account, <Text style={styles.boldText}>all your personal data will be permanently deleted</Text>.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. How We Store and Protect Your Data</Text>
        <Text style={styles.paragraph}>
          Your data is securely stored on <Text style={styles.boldText}>Supabase</Text> servers located in <Text style={styles.boldText}>France</Text>, with:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Encrypted storage</Text>
          <Text style={styles.bulletItem}>• Authenticated access</Text>
          <Text style={styles.bulletItem}>• Security audits performed</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. User Rights</Text>
        <Text style={styles.paragraph}>
          Under the GDPR, you have the right to:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Access your personal data</Text>
          <Text style={styles.bulletItem}>• Correct inaccurate data</Text>
          <Text style={styles.bulletItem}>• Delete your data</Text>
          <Text style={styles.bulletItem}>• Object to or restrict processing</Text>
          <Text style={styles.bulletItem}>• Port your data elsewhere</Text>
        </View>
        <Text style={styles.paragraph}>
          You can <Text style={styles.boldText}>delete your account and data directly from the app's settings screen</Text>.
        </Text>
        <Text style={styles.paragraph}>
          For any other requests, email us at:
        </Text>
        <Text style={styles.contactEmail}>📧 godardtheopro@gmail.com</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Third-Party Access</Text>
        <Text style={styles.paragraph}>
          We do <Text style={styles.boldText}>not</Text> share your data with third parties for advertising or marketing.
        </Text>
        <Text style={styles.paragraph}>
          All user data is stored securely via Supabase, our GDPR-compliant service provider.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>9. International Transfers</Text>
        <Text style={styles.paragraph}>
          We do <Text style={styles.boldText}>not transfer personal data outside of the European Union</Text>.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>10. Updates to This Policy</Text>
        <Text style={styles.paragraph}>
          We may occasionally update this Privacy Policy. You will be notified via:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Email</Text>
          <Text style={styles.bulletItem}>• App update in the App Store / Play Store</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>11. Contact</Text>
        <Text style={styles.paragraph}><Text style={styles.boldText}>Theo Godard</Text></Text>
        <Text style={styles.contactEmail}>📧 godardtheopro@gmail.com</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✅ Summary</Text>
        <Text style={styles.paragraph}>
          You give explicit consent when creating your account. Your data stays secure, is never sold, and can be deleted by you at any time.
        </Text>
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