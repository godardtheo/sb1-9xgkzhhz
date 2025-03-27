import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import ConfirmationModal from './ConfirmationModal';
import { useWorkoutProgressStore } from '@/lib/store/workoutProgressStore';

export default function ResumeTrainingButton() {
  const router = useRouter();
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  
  const { workoutName, endWorkout, templateId } = useWorkoutProgressStore(state => ({
    workoutName: state.workoutName,
    endWorkout: state.endWorkout,
    templateId: state.templateId
  }));

  const handleResume = () => {
    // Navigate back to the live workout screen
    // Pass the template_id if available to ensure the correct workout is loaded
    router.push({
      pathname: '/modals/live-workout',
      params: templateId ? { template_id: templateId } : {}
    });
  };
  
  const handleDiscard = () => {
    endWorkout();
    setShowDiscardModal(false);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.discardButton}
            onPress={() => setShowDiscardModal(true)}
          >
            <X size={20} color="#ffffff" />
          </Pressable>
          <Pressable style={styles.resumeButton} onPress={handleResume}>
            <Text style={styles.resumeButtonText}>Resume workout</Text>
          </Pressable>
        </View>
      </View>

      <ConfirmationModal
        visible={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onConfirm={handleDiscard}
        title="Discard Workout"
        message="Are you sure you want to discard this workout? All progress will be lost."
        confirmText="Discard"
        confirmColor="#ef4444"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // Positioned higher to avoid overlapping with the tab bar
    right: 16,
    zIndex: 100, // High enough to be above content but below modals
  },
  buttonContainer: {
    flexDirection: 'row',
    borderRadius: 24,
    overflow: 'hidden',
    width: 220, // Slightly wider to ensure text fits
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  discardButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '20%', // 1/4 as specified
  },
  resumeButton: {
    backgroundColor: '#14b8a6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%', // 3/4 as specified
  },
  resumeButtonText: {
    fontSize: 16, // Reduced from 16 to ensure single line
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    textAlign: 'center',
  },
});