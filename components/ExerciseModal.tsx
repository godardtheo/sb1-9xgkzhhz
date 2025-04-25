import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { Search, X, Check } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import CategoryFilter, { CategoryOption } from './CategoryFilter';

type Exercise = {
  id: string;
  name: string;
  muscle_primary?: string[];
  muscle_secondary?: string[];
  equipment?: string[];
  instructions?: string;
  video_url?: string;
  type?: string;
  difficulty?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercises: Exercise[]) => void;
  excludeExercises?: string[];
};

export default function ExerciseModal({ visible, onClose, onSelect, excludeExercises = [] }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>('all');

  const muscleGroups = [
    'abs', 'adductors', 'biceps', 'calves', 'chest', 'forearms', 'full_body', 
    'glutes', 'hamstrings', 'lats', 'lower_back', 'quads', 'shoulders', 
    'triceps', 'upper_back', 'upper_traps'
  ];

  useEffect(() => {
    if (visible) {
      fetchAllExercises();
    } else {
      setSelectedExercises([]);
      setSearchQuery('');
      setSelectedMuscle('');
      setSelectedCategory('all');
    }
  }, [visible]);

  useEffect(() => {
    filterExercises();
  }, [selectedMuscle, searchQuery, exercises, selectedCategory]);

  const fetchAllExercises = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('exercises')
        .select('*')
        .order('name');

      if (excludeExercises.length > 0) {
        query = query.not('id', 'in', `(${excludeExercises.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    let filtered = [...exercises];

    if (searchQuery) {
      filtered = filtered.filter(exercise => 
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedMuscle) {
      filtered = filtered.filter(exercise => 
        exercise.muscle_primary?.includes(selectedMuscle) 
      );
    }

    if (selectedCategory === 'favorite') {
      filtered = filtered.filter(exercise => 
        exercise.id && exercise.id.charAt(0) === 'a'
      );
    } else if (selectedCategory === 'frequent') {
      filtered = filtered.filter(exercise => 
        exercise.id && (exercise.id.charAt(0) === 'b' || exercise.id.charAt(0) === 'c')
      );
    }

    setFilteredExercises(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleMuscleSelect = (muscle: string) => {
    setSelectedMuscle(muscle === selectedMuscle ? '' : muscle);
  };

  const handleCategoryChange = (category: CategoryOption) => {
    setSelectedCategory(category);
  };

  const toggleExerciseSelection = (exerciseId: string) => {
    setSelectedExercises(prev => 
      prev.includes(exerciseId)
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handleConfirm = () => {
    const selectedItems = exercises.filter(exercise => 
      selectedExercises.includes(exercise.id)
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
              <Text style={styles.title}>Exercise selection</Text>
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
                placeholder="Search exercises..."
                placeholderTextColor="#5eead4"
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>

            <View style={styles.categoryContainer}>
              <CategoryFilter 
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
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
                    {muscle ? muscle.charAt(0).toUpperCase() + muscle.slice(1).replace('_', ' ') : ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView 
              style={styles.exercisesList}
              contentContainerStyle={styles.exercisesListContent}
            >
              {loading ? (
                <Text style={styles.statusText}>Loading exercises...</Text>
              ) : filteredExercises.length === 0 ? (
                <Text style={styles.statusText}>No exercises found</Text>
              ) : (
                filteredExercises.map((exercise) => {
                  const isSelected = selectedExercises.includes(exercise.id);
                  return (
                    <Pressable
                      key={exercise.id}
                      style={styles.exerciseItemContainer}
                      onPress={() => toggleExerciseSelection(exercise.id)}
                    >
                      <Animated.View 
                        style={[
                          styles.exerciseItem,
                          isSelected && styles.exerciseItemSelected
                        ]}
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(200)}
                      >
                        <View style={styles.exerciseContent}>
                          <View style={styles.exerciseImagePlaceholder}>
                            <Text style={styles.exerciseImageText}>
                              {exercise.name ? exercise.name.charAt(0).toUpperCase() : ''}
                            </Text>
                          </View>
                          <View style={styles.exerciseInfo}>
                            <Text 
                              style={styles.exerciseName}
                              numberOfLines={1}
                            >
                              {exercise.name}
                            </Text>
                            <View style={styles.muscleTags}>
                              {exercise.muscle_primary && exercise.muscle_primary.length > 0 ? (
                                exercise.muscle_primary.map((muscle, index) => (
                                  <View key={`primary-${index}`} style={styles.muscleTag}>
                                    <Text style={styles.muscleTagText}>
                                      {muscle ? muscle.charAt(0).toUpperCase() + muscle.slice(1).replace('_', ' ') : ''}
                                    </Text>
                                  </View>
                                ))
                              ) : (
                                <View style={styles.muscleTag}>
                                  <Text style={styles.muscleTagText}>No muscles</Text>
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
                  selectedExercises.length === 0 && styles.addButtonDisabled
                ]}
                onPress={handleConfirm}
                disabled={selectedExercises.length === 0}
              >
                <Text style={[
                  styles.addButtonText,
                  selectedExercises.length === 0 && styles.addButtonTextDisabled
                ]}>
                  Add {selectedExercises.length} Exercise{selectedExercises.length !== 1 ? 's' : ''}
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
    padding: 8,
    paddingLeft: 20,
    paddingTop: 0,
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
  categoryContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
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
  exercisesList: {
    flex: 1,
  },
  exercisesListContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  exerciseItemContainer: {
    marginBottom: 12,
  },
  exerciseItem: {
    backgroundColor: '#115e59',
    borderRadius: 12,
    overflow: 'hidden',
  },
  exerciseItemSelected: {
    backgroundColor: '#134e4a',
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  exerciseContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  exerciseImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseImageText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#f0fdfa',
  },
  exerciseInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 6,
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