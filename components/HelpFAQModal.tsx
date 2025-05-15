import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import InfoModal from './InfoModal';

type HelpFAQModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function HelpFAQModal({ visible, onClose }: HelpFAQModalProps) {
  return (
    <InfoModal
      visible={visible}
      onClose={onClose}
      title="Help & FAQ"
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Getting Started</Text>
        <View style={styles.questionContainer}>
          <Text style={styles.question}>How do I create a workout?</Text>
          <Text style={styles.answer}>
            Tap on the '+' button in the Action tab, then select 'New Workout'. You can add exercises, customize sets and reps, and save your workout.
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={styles.question}>How do I create a program?</Text>
          <Text style={styles.answer}>
            Tap on the '+' button in the Action tab, then select 'Programs' and 'New Program'. You can add multiple workouts to create a weekly training schedule.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workouts & Programs</Text>
        <View style={styles.questionContainer}>
          <Text style={styles.question}>What's the difference between a workout and a program?</Text>
          <Text style={styles.answer}>
            A workout is a single training session with specific exercises. A program is a collection of workouts organized into a training schedule.
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={styles.question}>How do I edit an existing workout?</Text>
          <Text style={styles.answer}>
            Go to 'My Workouts' in the Action tab, then select the workout you want to edit. You can add, remove, or reorder exercises.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tracking Progress</Text>
        <View style={styles.questionContainer}>
          <Text style={styles.question}>How do I track my workout history?</Text>
          <Text style={styles.answer}>
            Your completed workouts are automatically saved in the Statistics tab. You can view your progress over time.
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={styles.question}>How do I track my weight?</Text>
          <Text style={styles.answer}>
            Go to the Statistics tab and use the 'Log Weight' function to record your body weight over time.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Support</Text>
        <Text style={styles.contactText}>
          If you have any questions or need assistance, please contact us at:
        </Text>
        <Text style={styles.contactEmail}>godardtheopro@gmail.com</Text>
      </View>
    </InfoModal>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 16,
  },
  questionContainer: {
    marginBottom: 16,
    backgroundColor: '#115e59',
    borderRadius: 12,
    padding: 16,
  },
  question: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    lineHeight: 20,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    marginBottom: 8,
  },
  contactEmail: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#14b8a6',
  },
});