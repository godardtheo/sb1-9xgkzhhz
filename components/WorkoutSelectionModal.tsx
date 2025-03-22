import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { Search, X, Check } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

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
  onSelect: (workouts: Workout[]) => void;
  excludeWorkouts?: string[];
};

export default function WorkoutSelectionModal({ visible, onClose, onSelect, excludeWorkouts = [] }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<Workout[]>([]);
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const muscleGroups = [
    'chest', 'back', 'shoulders', 'legs', 'core', 'biceps', 'triceps'
  ];

  useEffect(() => {
    if (visible) {
      fetchAllWorkouts();
    } else {
      setSelectedWorkouts([]);
      setSearchQuery('');
      setSelectedMuscle('');
    }
  }, [visible]);

  useEffect(() => {
    filterWorkouts();
  }, [selectedMuscle, searchQuery, workouts]);

  const fetchAllWorkouts = async () => {
    try {
      setLoading(true);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all workout templates
      let query = supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (excludeWorkouts.length > 0) {
        query = query.not('id', 'in', `(${excludeWorkouts.join(',')})`);
      }

      const { data: workoutTemplates, error: workoutsError } = await query;
      
      if (workoutsError) {
        console.error('Error fetching workouts:', workoutsError);
        return;
      }

      // For each workout, get exercise count and set count
      const workoutsWithStats = await Promise.all((workoutTemplates || []).map(async (template) => {
        // Get exercise count
        const { count: exerciseCount } = await supabase
          .from('template_exercises')
          .select('*', { count: 'exact', head: true })
          .eq('template_id', template.id);

        // Get template exercise IDs
        const { data: exerciseIds } = await supabase
          .from('template_exercises')
          .select('id')
          .eq('template_id', template.id);
        
        // Get set count
        let setCount = 0;
        if (exerciseIds && exerciseIds.length > 0) {
          const ids = exerciseIds.map(ex => ex.id);
          const { count: setsCount } = await supabase
            .from('template_exercise_sets')
            .select('*', { count: 'exact', head: true })
            .in('template_exercise_id', ids);
          
          setCount = setsCount || 0;
        }

        return {
          id: template.id,
          name: template.name,
          description: template.description,
          muscles: template.muscles || [],
          estimated_duration: template.estimated_duration || '0 min',
          exercise_count: exerciseCount || 0,
          set_count: setCount
        };
      }));
      
      setWorkouts(workoutsWithStats);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterWorkouts = () => {
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
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleMuscleSelect = (muscle: string) => {
    setSelectedMuscle(muscle === selectedMuscle ? '' : muscle);
  };

  const toggleWorkoutSelection = (workoutId: string) => {
    setSelectedWorkouts(prev => 
      prev.includes(workoutId)
        ? prev.filter(id => id !== workoutId)
        : [...prev, workoutId]
    );
  };

  const handleConfirm = () => {
    const selectedItems = workouts.filter(workout => 
      selectedWorkouts.includes(workout.id)
    );
    onSelect(selectedItems);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Workout selection</Text>
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
                    {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView 
              style={styles.workoutsList}
              contentContainerStyle={styles.workoutsListContent}
            >
              {loading ? (
                <Text style={styles.statusText}>Loading workouts...</Text>
              ) : filteredWorkouts.length === 0 ? (
                <Text style={styles.statusText}>No workouts found</Text>
              ) : (
                filteredWorkouts.map((workout) => {
                  const isSelected = selectedWorkouts.includes(workout.id);
                  return (
                    <Pressable
                      key={workout.id}
                      style={styles.workoutItemContainer}
                      onPress={() => toggleWorkoutSelection(workout.id)}
                    >
                      <Animated.View 
                        style={[
                          styles.workoutItem,
                          isSelected && styles.workoutItemSelected
                        ]}
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(200)}
                      >
                        <View style={styles.workoutContent}>
                          <View style={styles.workoutImagePlaceholder}>
                            <Text style={styles.workoutImageText}>
                              {workout.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.workoutInfo}>
                            <Text 
                              style={styles.workoutName}
                              numberOfLines={1}
                            >
                              {workout.name}
                            </Text>
                            <View style={styles.workoutStats}>
                              <Text style={styles.workoutStatsText}>
                                {workout.exercise_count || 0} exercises • {workout.set_count || 0} sets • {workout.estimated_duration}
                              </Text>
                            </View>
                            <View style={styles.muscleTags}>
                              {workout.muscles && workout.muscles.slice(0, 3).map((muscle) => (
                                <View key={muscle} style={styles.muscleTag}>
                                  <Text style={styles.muscleTagText}>
                                    {muscle.charAt(0).toUpperCase() + muscle.slice(1).replace('_', ' ')}
                                  </Text>
                                </View>
                              ))}
                              {workout.muscles && workout.muscles.length > 3 && (
                                <View style={[styles.muscleTag, styles.moreTag]}>
                                  <Text style={styles.muscleTagText}>
                                    +{workout.muscles.length - 3}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <View style={styles.checkmarkContainer}>
                            {isSelected && (
                              <Animated.View 
                                style={styles.checkmark}
                                entering={FadeIn.duration(200)}
                                exiting={FadeOut.duration(200)}
                              >
                                <Check size={20} color="#14b8a6" />
                              </Animated.View>
                            )}
                          </View>
                        </View>
                      </Animated.View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.bottomBar}>
              <Pressable 
                style={[
                  styles.addButton,
                  selectedWorkouts.length === 0 && styles.addButtonDisabled
                ]}
                onPress={handleConfirm}
                disabled={selectedWorkouts.length === 0}
              >
                <Text style={[
                  styles.addButtonText,
                  selectedWorkouts.length === 0 && styles.addButtonTextDisabled
                ]}>
                  Add {selectedWorkouts.length} Workout{selectedWorkouts.length !== 1 ? 's' : ''}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    height: '90%',
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
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  closeButton: {
    padding: 4,
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
    outlineStyle: 'none',
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
    flex: 1,
  },
  workoutsListContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  workoutItemContainer: {
    marginBottom: 12,
  },
  workoutItem: {
    backgroundColor: '#115e59',
    borderRadius: 12,
    overflow: 'hidden',
  },
  workoutItemSelected: {
    backgroundColor: '#134e4a',
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  workoutContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  workoutImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutImageText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#f0fdfa',
  },
  workoutInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  workoutName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  workoutStats: {
    marginBottom: 6,
  },
  workoutStatsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleTag: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  moreTag: {
    backgroundColor: '#134e4a',
  },
  muscleTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#f0fdfa',
  },
  checkmarkContainer: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0fdfa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#5eead4',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Inter-Regular',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    backgroundColor: '#031A19',
    borderTopWidth: 1,
    borderTopColor: '#115e59',
  },
  addButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#115e59',
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#021a19',
  },
  addButtonTextDisabled: {
    color: '#5eead4',
  },
});