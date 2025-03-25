import { View, Text, StyleSheet, ScrollView, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth/store';
import CurrentProgramCard from '@/components/CurrentProgramCard';
import HistoryHomeCard from '@/components/HistoryHomeCard';
import NewWorkoutCard from '@/components/NewWorkoutCard';
import LogWeightCard from '@/components/LogWeightCard';
import { X, Plus, ArrowRight } from 'lucide-react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const { userProfile, fetchUserProfile } = useAuthStore();
  const username = userProfile?.username || 'there';
  
  // Workout tracking modal state
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState([{ name: '', sets: '', reps: '' }]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Attempt to fetch/refresh user profile when the component mounts
    if (!userProfile) {
      fetchUserProfile();
    }
  }, [fetchUserProfile, userProfile]);

  // Exercise management functions
  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: '', reps: '' }]);
  };

  const removeExercise = (index) => {
    const updatedExercises = [...exercises];
    updatedExercises.splice(index, 1);
    setExercises(updatedExercises);
  };

  const updateExercise = (index, field, value) => {
    const updatedExercises = [...exercises];
    updatedExercises[index][field] = value;
    setExercises(updatedExercises);
  };

  // Save workout function
  const saveWorkout = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      if (!workoutName.trim()) {
        setErrorMessage('Please enter a workout name');
        setLoading(false);
        return;
      }

      if (exercises.some(ex => !ex.name.trim())) {
        setErrorMessage('All exercises must have a name');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage('You must be logged in to save workouts');
        setLoading(false);
        return;
      }

      // Create workout record
      const { data: workout, error: workoutError } = await supabase
        .from('workout_history')
        .insert({
          user_id: user.id,
          workout_name: workoutName.trim(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Save exercises
      const exercisesData = exercises.map(ex => ({
        workout_id: workout.id,
        exercise_name: ex.name.trim(),
        sets: parseInt(ex.sets) || 0,
        reps: parseInt(ex.reps) || 0,
      }));

      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(exercisesData);

      if (exercisesError) throw exercisesError;

      setSuccessMessage('Workout saved successfully!');
      
      // Reset form
      setTimeout(() => {
        setWorkoutName('');
        setExercises([{ name: '', sets: '', reps: '' }]);
        setSuccessMessage('');
        setShowWorkoutModal(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving workout:', error);
      setErrorMessage(error.message || 'Failed to save workout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Hello </Text>
            <Text style={styles.name}>{username}</Text>
          </View>
        </View>

        {/* Current Program Card */}
        <CurrentProgramCard />

        {/* History Card */}
        <HistoryHomeCard />

        {/* Quick Actions Row */}
        <View style={styles.quickActions}>
          <NewWorkoutCard />
          
          {/* Log Workout Card */}
          <Pressable 
            style={styles.logWorkoutCard}
            onPress={() => setShowWorkoutModal(true)}
          >
            <View style={styles.cardIcon}>
              <Plus size={24} color="#021a19" />
            </View>
            <Text style={styles.cardTitle}>Log Workout</Text>
          </Pressable>
          
          <LogWeightCard />
        </View>
      </ScrollView>

      {/* Workout Tracking Modal */}
      <Modal
        visible={showWorkoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWorkoutModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <Pressable 
              style={styles.modalBackdrop} 
              onPress={() => setShowWorkoutModal(false)}
            />
            <Animated.View 
              style={styles.modalContainer}
              entering={SlideInDown.springify().damping(15)}
              exiting={SlideOutDown.springify().damping(15)}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Log Workout</Text>
                <Pressable 
                  onPress={() => setShowWorkoutModal(false)}
                  hitSlop={8}
                >
                  <X size={24} color="#5eead4" />
                </Pressable>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Workout Name</Text>
                  <TextInput
                    style={styles.input}
                    value={workoutName}
                    onChangeText={setWorkoutName}
                    placeholder="E.g., Morning Chest Day"
                    placeholderTextColor="#5eead4"
                  />
                </View>

                <Text style={styles.sectionHeader}>Exercises</Text>
                
                {exercises.map((exercise, index) => (
                  <View key={index} style={styles.exerciseItem}>
                    <View style={styles.exerciseFormGroup}>
                      <Text style={styles.label}>Exercise Name</Text>
                      <TextInput
                        style={styles.input}
                        value={exercise.name}
                        onChangeText={(value) => updateExercise(index, 'name', value)}
                        placeholder="E.g., Bench Press"
                        placeholderTextColor="#5eead4"
                      />
                    </View>
                    
                    <View style={styles.exerciseDetails}>
                      <View style={styles.exerciseFormHalf}>
                        <Text style={styles.label}>Sets</Text>
                        <TextInput
                          style={styles.input}
                          value={exercise.sets}
                          onChangeText={(value) => updateExercise(index, 'sets', value)}
                          placeholder="3"
                          placeholderTextColor="#5eead4"
                          keyboardType="numeric"
                        />
                      </View>
                      
                      <View style={styles.exerciseFormHalf}>
                        <Text style={styles.label}>Reps</Text>
                        <TextInput
                          style={styles.input}
                          value={exercise.reps}
                          onChangeText={(value) => updateExercise(index, 'reps', value)}
                          placeholder="12"
                          placeholderTextColor="#5eead4"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    {exercises.length > 1 && (
                      <Pressable 
                        style={styles.removeButton} 
                        onPress={() => removeExercise(index)}
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </Pressable>
                    )}
                  </View>
                ))}

                <Pressable 
                  style={styles.addExerciseButton}
                  onPress={addExercise}
                >
                  <Plus size={20} color="#5eead4" />
                  <Text style={styles.addExerciseText}>Add Exercise</Text>
                </Pressable>

                {errorMessage ? (
                  <Text style={styles.errorMessage}>{errorMessage}</Text>
                ) : null}

                {successMessage ? (
                  <Animated.View 
                    style={styles.successMessage}
                    entering={FadeIn.duration(300)}
                  >
                    <Text style={styles.successMessageText}>{successMessage}</Text>
                  </Animated.View>
                ) : null}
              </ScrollView>

              <View style={styles.modalFooter}>
                <Pressable 
                  style={styles.saveButton}
                  onPress={saveWorkout}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Saving...' : 'Save Workout'}
                  </Text>
                  {!loading && <ArrowRight size={20} color="#021a19" />}
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    padding: 16,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  greeting: {
    fontSize: 24,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  // Log Workout Card styles
  logWorkoutCard: {
    backgroundColor: '#0f766e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#14b8a6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#ccfbf1',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 26, 25, 0.8)',
  },
  modalContainer: {
    backgroundColor: '#031A19',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#115e59',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  modalContent: {
    padding: 20,
    paddingBottom: 80, // Space for the footer
  },
  modalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#031A19',
    borderTopWidth: 1,
    borderTopColor: '#115e59',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#115e59',
    borderRadius: 12,
    padding: 12,
    color: '#ccfbf1',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 16,
    marginTop: 8,
  },
  exerciseItem: {
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  exerciseFormGroup: {
    marginBottom: 12,
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  exerciseFormHalf: {
    flex: 1,
  },
  removeButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#450a0a',
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3d56',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  addExerciseText: {
    color: '#5eead4',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14b8a6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#021a19',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  errorMessage: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  successMessage: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  successMessageText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});