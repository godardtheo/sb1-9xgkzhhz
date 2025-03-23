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
      title="Terms and Conditions"
    >
      <View style={styles.section}>
        <Text style={styles.lastUpdated}>Last Updated: March, 2025</Text>
        <Text style={styles.paragraph}>
          Please read these Terms and Conditions ("Terms") carefully before using the SetLog mobile application.
          By downloading, accessing, or using SetLog, you agree to be bound by these Terms.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using SetLog, you acknowledge that you have read, understood, and agree to be bound by these Terms.
          If you do not agree to these Terms, please do not use our application.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Account Registration</Text>
        <Text style={styles.paragraph}>
          To use certain features of SetLog, you may need to create an account. You are responsible for maintaining the confidentiality
          of your account credentials and for all activities that occur under your account.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. User Content</Text>
        <Text style={styles.paragraph}>
          You retain ownership of any workout data, programs, and other content you create or submit to SetLog.
          By submitting content, you grant us a non-exclusive, worldwide, royalty-free license to use, store, and display
          your content for the purpose of providing and improving our services.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Acceptable Use</Text>
        <Text style={styles.paragraph}>
          You agree not to use SetLog for any unlawful purpose or in any way that could damage, disable, or impair our services.
          You must not attempt to gain unauthorized access to any part of our services or systems.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Disclaimers</Text>
        <Text style={styles.paragraph}>
          SetLog is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that our services
          will be uninterrupted, secure, or error-free. You use the app at your own risk.
        </Text>
        <Text style={styles.paragraph}>
          SetLog is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a healthcare professional
          before starting any exercise program.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          To the maximum extent permitted by law, SetLog shall not be liable for any indirect, incidental, special, consequential,
          or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Modifications to Terms</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these Terms at any time. We will provide notice of significant changes by posting the updated Terms
          within the app. Your continued use of SetLog after such modifications constitutes your acceptance of the updated Terms.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which we operate,
          without regard to its conflict of law provisions.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms, please contact us at:
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
  contactEmail: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#14b8a6',
  },
});