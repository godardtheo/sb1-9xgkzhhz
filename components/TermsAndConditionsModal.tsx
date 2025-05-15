import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import InfoModal from './InfoModal';

type TermsAndConditionsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function TermsAndConditionsModal({ visible, onClose }: TermsAndConditionsModalProps) {
  return (
    <InfoModal
      visible={visible}
      onClose={onClose}
      title="Terms of Service"
    >
      <View style={styles.section}>
        <Text style={styles.paragraph}><Text style={styles.boldText}>Effective date:</Text> May 14, 2025</Text>
        <Text style={styles.lastUpdated}>Last updated: May 14, 2025</Text>
        <Text style={styles.paragraph}>
          These Terms govern your use of the SetLog mobile application ("App"). By creating an account, you agree to these Terms.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Eligibility</Text>
        <Text style={styles.paragraph}>To use SetLog, you must:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Be at least 16 years old (or have parental consent)</Text>
          <Text style={styles.bulletItem}>• Provide accurate registration information</Text>
          <Text style={styles.bulletItem}>• Accept this agreement and our Privacy Policy</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. User Consent & Account Creation</Text>
        <Text style={styles.paragraph}>
          By creating an account, you <Text style={styles.boldText}>explicitly consent</Text> to SetLog collecting and processing your personal data. You must check a consent box to proceed. If you do not provide consent, you will not be able to use the App.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Account Responsibility</Text>
        <Text style={styles.paragraph}>You are responsible for:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Keeping your login credentials safe</Text>
          <Text style={styles.bulletItem}>• All activities under your account</Text>
        </View>
        <Text style={styles.paragraph}>
          We reserve the right to suspend or terminate accounts that violate these Terms or applicable laws.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Deleting Your Account</Text>
        <Text style={styles.paragraph}>
          You may delete your account at any time from the app's <Text style={styles.boldText}>Settings</Text> screen.
        </Text>
        <Text style={styles.paragraph}>
          Once deleted, <Text style={styles.boldText}>all your personal data will be permanently removed</Text> from our systems.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. User Content</Text>
        <Text style={styles.paragraph}>
          You retain ownership of the content you enter. You grant us a limited license to use it for providing our service.
        </Text>
        <Text style={styles.paragraph}>
          You are responsible for the legality and accuracy of your content.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Privacy</Text>
        <Text style={styles.paragraph}>
          Please refer to our <Text style={styles.boldText}>Privacy Policy</Text> for how we collect, use, and store personal data.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. App Updates</Text>
        <Text style={styles.paragraph}>
          We may modify or discontinue features of the App at any time.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          All intellectual property related to SetLog remains our property. You may not copy, modify, or redistribute any part of the App.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>9. Disclaimer</Text>
        <Text style={styles.paragraph}>
          SetLog is provided "as is." We are not liable for:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Data loss</Text>
          <Text style={styles.bulletItem}>• Service interruptions</Text>
          <Text style={styles.bulletItem}>• Health consequences of training decisions</Text>
        </View>
        <Text style={styles.paragraph}>
          Please consult a fitness professional before starting any new program.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may update these Terms. You will be informed via:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Email</Text>
          <Text style={styles.bulletItem}>• App updates</Text>
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
          You must provide consent to use SetLog. You can delete your data at any time, and we take your privacy seriously.
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
  contactEmail: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#14b8a6',
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
});