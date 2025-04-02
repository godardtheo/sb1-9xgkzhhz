import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Info, Plus, ChevronRight } from 'lucide-react-native';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Animated, { FadeIn } from 'react-native-reanimated';
import ProgramMetricsModal from '@/components/ProgramMetricsModal';
import WorkoutSelectionModal from '@/components/WorkoutSelectionModal';
import DraggableWorkoutCard from '@/components/DraggableWorkoutCard';
import { useWorkoutReorder } from '@/hooks/useWorkoutReorder';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ActiveProgramModal from '@/components/ActiveProgramModal';
import { useProgramStore } from '@/lib/store/programStore';
import { formatDuration, parseDurationToMinutes } from '@/lib/utils/formatDuration';

type SelectedWorkout = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  estimated_duration: string;
  exercise_count: number;
  set_count?: number;
};

export default function NewProgramScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showWorkoutSelection, setShowWorkoutSelection] = useState(false);
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [previousProgram, setPreviousProgram] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedWorkouts, setSelectedWorkouts] = useState<SelectedWorkout[]>([]);
  const [shouldCheckActive, setShouldCheckActive] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { setNeedsRefresh, getActiveProgram } = useProgramStore();

  const {
    workouts: reorderedWorkouts,
    setWorkouts: setReorderedWorkouts,
    activeIndex,
    itemOffsets,
    itemTranslations,
    updateItemHeight,
    handleDragActive,
    handleDragEnd,
  } = useWorkoutReorder(selectedWorkouts);

  // Keep selectedWorkouts and reorderedWorkouts in sync
  useEffect(() => {
    if (selectedWorkouts && selectedWorkouts.length > 0) {
      setReorderedWorkouts(selectedWorkouts);
    }
  }, [selectedWorkouts]);

  // Handle active toggle changes
  const handleActiveToggle = (value: boolean) => {
    setIsActive(value);
    // Only flag for check if toggling to active
    if (value) {
      setShouldCheckActive(true);
    }
  };

  const checkActiveStatus = async () => {
    // Only check if trying to activate
    if (isActive) {
      // Check if another program is already active
      const activeProgram = await getActiveProgram();
      if (activeProgram) {
        setPreviousProgram(activeProgram);
        setShowActiveModal(true);
        return false; // Indicate check is in progress
      }
    }
    return true; // Proceed with save
  };

  const totalWorkouts = selectedWorkouts.length;
  const totalSets = selectedWorkouts.reduce((acc, workout) => acc + (workout.exercise_count * 4), 0);
  const totalMinutes = selectedWorkouts.reduce((acc, workout) => {
    return acc + parseDurationToMinutes(workout.estimated_duration);
  }, 0);
  const formattedDuration = formatDuration(totalMinutes);

  const handleSave = async () => {
    try {
      if (!name.trim()) {
        setError('Program name is required');
        return;
      }

      if (selectedWorkouts.length === 0) {
        setError('Add at least one workout to the program');
        return;
      }

      // If we need to check active status and it's pending user confirmation
      if (shouldCheckActive) {
        const canProceed = await checkActiveStatus();
        setShouldCheckActive(false);
        if (!canProceed) {
          return; // Wait for user confirmation in the modal
        }
      }

      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create program
      const { data: program, error: programError } = await supabase
        .from('programs')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          weekly_workouts: selectedWorkouts.length,
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (programError) throw programError;

      // If this program is set as active and there's a previous active program,
      // we need to update the active states
      if (isActive && previousProgram) {
        // Deactivate the previous active program
        const { error: deactivateError } = await supabase
          .from('programs')
          .update({ is_active: false })
          .eq('id', previousProgram.id);

        if (deactivateError) throw deactivateError;
      }

      // Add workouts to program using the reordered list to preserve order
      const workoutsToAdd = reorderedWorkouts.map((workout, index) => ({
        program_id: program.id,
        template_id: workout.id,
        name: workout.name,
        description: workout.description,
        muscles: workout.muscles,
        estimated_duration: workout.estimated_duration,
        order: index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: workoutsError } = await supabase
        .from('program_workouts')
        .insert(workoutsToAdd);

      if (workoutsError) {
        // Cleanup program if workout insertion fails
        await supabase
          .from('programs')
          .delete()
          .eq('id', program.id);
        throw workoutsError;
      }

      // Notify that program store needs refresh
      setNeedsRefresh(true);
      
      // Show success message and redirect
      setSaveSuccess(true);
      setTimeout(() => {
        router.push('/modals/programs');
      }, 1500);

    } catch (err: any) {
      console.error('Error saving program:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeWorkout = (workoutId: string) => {
    setSelectedWorkouts(prev => prev.filter(w => w.id !== workoutId));
  };

  const handleWorkoutSelection = (workouts: SelectedWorkout[]) => {
    setSelectedWorkouts(prev => [...prev, ...workouts]);
    setShowWorkoutSelection(false);
  };

  const handleWorkoutInfo = (workout: SelectedWorkout) => {
    // For now just navigate to workout details
    router.push(`/modals/workouts/${workout.id}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <ArrowLeft size={24} color="#5eead4" />
        </Pressable>
        <View style={styles.titleContainer}>
          <TextInput
            style={[styles.titleInput, Platform.OS === 'web' && styles.titleInputWeb]}
            placeholder="Program name"
            placeholderTextColor="#5eead4"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.descriptionInput, Platform.OS === 'web' && styles.descriptionInputWeb]}
            placeholder="Description"
            placeholderTextColor="#5eead4"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsPanel}>
          <View style={styles.toggleContainer}>
            <Switch
              value={isActive}
              onValueChange={handleActiveToggle}
              trackColor={{ false: '#115e59', true: '#0d9488' }}
              thumbColor={isActive ? '#14b8a6' : '#5eead4'}
              style={styles.switch}
            />
            <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>
              Active
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalWorkouts}</Text>
            <Text style={styles.statLabel}>workouts</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>sets</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formattedDuration}</Text>
            <Text style={styles.statLabel}>duration</Text>
          </View>
        </View>

        <Pressable 
          onPress={() => setShowMetrics(true)}
          style={styles.infoButton}
          hitSlop={8}
        >
          <Info size={20} color="#5eead4" />
        </Pressable>
      </View>

      <GestureHandlerRootView style={{ flex: 1 }}>
        <ScrollView 
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.workoutsList}
          showsVerticalScrollIndicator={true}
        >
          {selectedWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Add workouts to create your program
              </Text>
              <Pressable 
                style={styles.addWorkoutButton}
                onPress={() => setShowWorkoutSelection(true)}
              >
                <Plus size={20} color="#ccfbf1" />
                <Text style={styles.addWorkoutText}>Add Workout</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {reorderedWorkouts.map((workout, index) => (
                <DraggableWorkoutCard
                  key={workout.id}
                  workout={workout}
                  index={index}
                  onDragEnd={handleDragEnd}
                  onRemove={removeWorkout}
                  onPress={() => router.push(`/modals/workouts/${workout.id}`)}
                  onInfo={() => handleWorkoutInfo(workout)}
                  totalWorkouts={selectedWorkouts.length}
                  activeIndex={activeIndex}
                  itemOffsets={itemOffsets}
                  itemTranslations={itemTranslations}
                  updateItemHeight={updateItemHeight}
                  handleDragActive={handleDragActive}
                />
              ))}
              <Pressable 
                style={styles.addWorkoutButton}
                onPress={() => setShowWorkoutSelection(true)}
              >
                <Plus size={20} color="#ccfbf1" />
                <Text style={styles.addWorkoutText}>Add Workout</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </GestureHandlerRootView>

      {error && (
        <Animated.View 
          style={styles.errorMessage}
          entering={FadeIn.duration(200)}
        >
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}

      {saveSuccess && (
        <Animated.View 
          style={styles.successMessage}
          entering={FadeIn.duration(200)}
        >
          <Text style={styles.successText}>Program saved successfully!</Text>
        </Animated.View>
      )}

      {selectedWorkouts.length > 0 && (
        <View style={styles.bottomButtonContainer}>
          <Pressable 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#021a19" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save Program</Text>
                <ChevronRight size={20} color="#021a19" />
              </>
            )}
          </Pressable>
        </View>
      )}

      <ProgramMetricsModal
        visible={showMetrics}
        onClose={() => setShowMetrics(false)}
        metrics={{
          workouts: totalWorkouts,
          sets: totalSets,
          duration: formattedDuration
        }}
      />

      <WorkoutSelectionModal
        visible={showWorkoutSelection}
        onClose={() => setShowWorkoutSelection(false)}
        onSelect={handleWorkoutSelection}
      />

      <ActiveProgramModal
        visible={showActiveModal}
        onClose={() => {
          setShowActiveModal(false);
          setIsActive(false);
        }}
        onConfirm={() => {
          setShowActiveModal(false);
          // Continue with the save operation - the active status stays true
          handleSave();
        }}
        previousProgramName={previousProgram?.name || ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 40 : 24,
    backgroundColor: '#021a19',
    borderBottomWidth: 1,
    borderBottomColor: '#115e59',
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  backButton: {
    marginRight: 16,
    marginTop: 4,
  },
  titleContainer: {
    flex: 1,
  },
  titleInput: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 8,
    backgroundColor: '#115e59',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0d9488',
    padding: 8,
    height: 40,
  },
  titleInputWeb: {
    outlineStyle: 'none',
  },
  descriptionInput: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ccfbf1',
    minHeight: 40,
    backgroundColor: '#115e59',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0d9488',
    padding: 8,
  },
  descriptionInputWeb: {
    outlineStyle: 'none',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 4,
  },
  statsPanel: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0d3d56',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingHorizontal: 4,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    opacity: 0.3,
  },
  toggleTextActive: {
    opacity: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#115e59',
    marginHorizontal: 0,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  workoutsList: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },
  emptyState: {
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    textAlign: 'center',
  },
  addWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3d56',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 16,
  },
  addWorkoutText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginLeft: 8,
  },
  bottomButtonContainer: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14b8a6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    minHeight: 56,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 12,
      },
    }),
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#021a19',
  },
  errorMessage: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 160 : 140,
    left: 16,
    right: 16,
    backgroundColor: '#450a0a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  successMessage: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 160 : 140,
    left: 16,
    right: 16,
    backgroundColor: '#065f46',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  successText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
});