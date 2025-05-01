import { View, Text, StyleSheet, Modal, Pressable, Platform, FlatList, ActivityIndicator, TextInput, ScrollView, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { X, ChevronRight, Dumbbell, PlusCircle, Play, Search, ArrowLeft } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { getNextWorkout } from '@/lib/workoutUtils';
import { supabase } from '@/lib/supabase';
import { formatDuration, parseDurationToMinutes } from '@/lib/utils/formatDuration';

type Workout = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  estimated_duration: string;
  exercise_count?: number;
  set_count?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ChooseWorkoutModal({ visible, onClose }: Props) {
  const router = useRouter();
  const [showWorkoutsList, setShowWorkoutsList] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextWorkout, setNextWorkout] = useState<{
    programName: string;
    nextWorkout: { id: string; name: string; template_id: string } | null;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');
  const [filteredWorkouts, setFilteredWorkouts] = useState<Workout[]>([]);
  const [loadingNextWorkout, setLoadingNextWorkout] = useState(false);

  const muscleGroups = [
    'chest', 'back', 'shoulders', 'legs', 'core', 'biceps', 'triceps'
  ];

  // Fetch next workout from active program
  useEffect(() => {
    if (visible) {
      fetchNextWorkout();
      fetchWorkouts();
    } else {
      // Reset UI state when modal closes
      setShowWorkoutsList(false);
      setSearchQuery('');
      setSelectedMuscle('');
    }
  }, [visible]);

  // Filter workouts based on search and selected muscle
  useEffect(() => {
    let filtered = [...workouts];

    if (searchQuery) {
      filtered = filtered.filter(workout => 
        workout.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedMuscle) {
      filtered = filtered.filter(workout => 
        workout.muscles?.includes(selectedMuscle)
      );
    }

    setFilteredWorkouts(filtered);
  }, [searchQuery, selectedMuscle, workouts]);

  const fetchNextWorkout = async () => {
    try {
      setLoadingNextWorkout(true);
      const data = await getNextWorkout();
      setNextWorkout(data);
    } catch (error) {
      console.error('Error fetching next workout:', error);
    } finally {
      setLoadingNextWorkout(false);
    }
  };

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          id,
          name,
          description,
          muscles,
          estimated_duration,
          template_exercises!inner (
            id,
            sets
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedWorkouts = data?.map(workout => ({
        ...workout,
        exercise_count: workout.template_exercises.length,
        set_count: workout.template_exercises.reduce((total: number, ex: any) => total + (ex.sets || 0), 0)
      })) || [];

      setWorkouts(formattedWorkouts);
      setFilteredWorkouts(formattedWorkouts);
    } catch (error: any) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNextWorkout = () => {
    if (nextWorkout?.nextWorkout) {
      router.push({
        pathname: '/modals/live-workout',
        params: { template_id: nextWorkout.nextWorkout.template_id }
      });
      onClose();
    } else {
      // No next workout available
      alert('No next workout available in your program.');
    }
  };

  const handleSelectWorkout = (workoutId: string) => {
    router.push({
      pathname: '/modals/live-workout',
      params: { template_id: workoutId }
    });
    onClose();
  };

  const handleStartFromScratch = () => {
    router.push('/modals/live-workout');
    onClose();
  };

  const handleMuscleSelect = (muscle: string) => {
    setSelectedMuscle(muscle === selectedMuscle ? '' : muscle);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  // Main options screen content
  const renderMainOptions = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Select workout</Text>
        <Pressable 
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color="#5eead4" />
        </Pressable>
      </View>

      <View style={styles.optionsContainer}>
        {/* Next Workout option */}
        <Pressable 
          style={styles.optionCard}
          onPress={handleStartNextWorkout}
          disabled={loadingNextWorkout || !nextWorkout?.nextWorkout}
        >
          <View style={styles.optionIconContainer}>
            <Play size={24} color="#042f2e" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Next Workout</Text>
            <Text style={styles.optionSubtitle}>
              {loadingNextWorkout 
                ? 'Loading...' 
                : nextWorkout?.nextWorkout 
                  ? nextWorkout.nextWorkout.name
                  : 'No active program'
              }
            </Text>
          </View>
          <ChevronRight size={20} color="#5eead4" />
        </Pressable>

        {/* From My Workouts option */}
        <Pressable 
          style={styles.optionCard}
          onPress={() => setShowWorkoutsList(true)}
        >
          <View style={styles.optionIconContainer}>
            <Dumbbell size={24} color="#042f2e" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>From my workouts</Text>
            <Text style={styles.optionSubtitle}>Choose a workout template</Text>
          </View>
          <ChevronRight size={20} color="#5eead4" />
        </Pressable>

        {/* From Scratch option - Icon updated to PlusCircle */}
        <Pressable 
          style={styles.optionCard}
          onPress={handleStartFromScratch}
        >
          <View style={styles.optionIconContainer}>
            <PlusCircle size={24} color="#042f2e" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>From scratch</Text>
            <Text style={styles.optionSubtitle}>Create a new workout</Text>
          </View>
          <ChevronRight size={20} color="#5eead4" />
        </Pressable>
      </View>
    </>
  );

  // Workouts list screen content
  const renderWorkoutsList = () => (
    <>
      <View style={styles.header}>
        <Pressable 
          onPress={() => setShowWorkoutsList(false)}
          style={styles.backButton}
          hitSlop={8}
        >
          <ArrowLeft size={24} color="#5eead4" />
        </Pressable>
        <Text style={styles.title}>My Workouts</Text>
        <Pressable 
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color="#5eead4" />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#5eead4" />
        <TextInput
          style={[styles.searchInput, Platform.OS === 'web' && styles.searchInputWeb]}
          placeholder="Search workouts..."
          placeholderTextColor="#5eead4"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.muscleGroupsScroll}
        contentContainerStyle={styles.muscleGroupsContent}
      >
        {muscleGroups.map((muscle) => (
          <Pressable
            key={muscle}
            style={[
              styles.muscleGroupButton,
              selectedMuscle === muscle && styles.selectedMuscleGroup
            ]}
            onPress={() => handleMuscleSelect(muscle)}
          >
            <Text style={[
              styles.muscleGroupText,
              selectedMuscle === muscle && styles.selectedMuscleGroupText
            ]}>
              {muscle ? muscle.charAt(0).toUpperCase() + muscle.slice(1) : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading workouts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredWorkouts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Pressable 
              style={styles.workoutItem}
              onPress={() => handleSelectWorkout(item.id)}
            >
              <View style={styles.workoutImagePlaceholder}>
                <Text style={styles.workoutImageText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.workoutStats}>
                  {item.exercise_count || 0} exercises • {item.set_count || 0} sets • {formatDuration(parseDurationToMinutes(item.estimated_duration))}
                </Text>
                {item.muscles && item.muscles.length > 0 && (
                  <View style={styles.muscleChips}>
                    {item.muscles.slice(0, 3).map((muscle, index) => (
                      <View key={index} style={styles.muscleChip}>
                        <Text style={styles.muscleChipText}>
                          {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                        </Text>
                      </View>
                    ))}
                    {item.muscles.length > 3 && (
                      <View style={styles.muscleChip}>
                        <Text style={styles.muscleChipText}>+{item.muscles.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              <ChevronRight size={20} color="#5eead4" />
            </Pressable>
          )}
          contentContainerStyle={styles.workoutsList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No workouts found</Text>
            </View>
          }
        />
      )}
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View 
          style={styles.modalContainer}
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.springify().damping(15)}
        >
          <View style={styles.modalContent}>
            {showWorkoutsList ? renderWorkoutsList() : renderMainOptions()}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create<{[key: string]: ViewStyle | TextStyle | ImageStyle}>({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 26, 25, 0.8)',
  },
  modalContainer: {
    backgroundColor: '#031A19',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    width: '100%',
    overflow: 'hidden',
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#115e59',
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    padding: 16,
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#115e59',
    margin: 16,
    borderRadius: 12,
    padding: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ccfbf1',
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    height: Platform.OS === 'web' ? 24 : 'auto',
    padding: 0,
  },
  searchInputWeb: {
    outlineWidth: 0,
  },
  muscleGroupsScroll: {
    maxHeight: 40,
  },
  muscleGroupsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  muscleGroupButton: {
    backgroundColor: '#115e59',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedMuscleGroup: {
    backgroundColor: '#14b8a6',
  },
  muscleGroupText: {
    color: '#5eead4',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  selectedMuscleGroupText: {
    color: '#042f2e',
  },
  workoutsList: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#115e59',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workoutImageText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#f0fdfa',
  },
  workoutInfo: {
    flex: 1,
    marginRight: 12,
  },
  workoutName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  workoutStats: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    marginBottom: 6,
  },
  muscleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleChip: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  muscleChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#f0fdfa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#5eead4',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    marginTop: 12,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#5eead4',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
});