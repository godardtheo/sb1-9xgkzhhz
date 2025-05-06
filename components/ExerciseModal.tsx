import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, Platform, ActivityIndicator, ViewStyle, TextStyle, ImageStyle, StyleProp } from 'react-native';
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
  is_favorite?: boolean;
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
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<{id: string, order: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>('all');
  const [error, setError] = useState<string | null>(null);

  const muscleGroups = [
    'abs', 'adductors', 'biceps', 'calves', 'chest', 'forearms', 'full_body', 
    'glutes', 'hamstrings', 'lats', 'lower_back', 'quads', 'shoulders', 
    'triceps', 'upper back', 'upper traps'
  ];

  useEffect(() => {
    if (visible) {
      setSelectedExerciseIds([]);
      setSearchQuery('');
      setSelectedMuscle('');
      setSelectedCategory('all');
      fetchExercises('all', '', '');
    } else {
      setExercises([]);
      setFilteredExercises([]);
      setSelectedExerciseIds([]);
      setSearchQuery('');
      setSelectedMuscle('');
      setSelectedCategory('all');
      setError(null);
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      fetchExercises(selectedCategory, searchQuery, selectedMuscle);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (visible && !loading) {
      filterExercisesAndUpdateState();
    }
  }, [searchQuery, selectedMuscle, exercises, loading]);

  const filterExercisesAndUpdateState = () => {
    let filtered = [...exercises];

    if (searchQuery && searchQuery.length >= 1) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedMuscle) {
      filtered = filtered.filter(exercise =>
        exercise.muscle_primary?.includes(selectedMuscle)
      );
    }
    setFilteredExercises(filtered);
  };

  const fetchExercises = async (category: CategoryOption, currentSearchQuery: string, currentSelectedMuscle: string) => {
    if (!visible) return;

    try {
      setLoading(true);
      setError(null);
      setExercises([]);
      setFilteredExercises([]);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { data: favoritesData, error: favoritesError } = await supabase
        .from('user_favorite_exercises')
        .select('exercise_id')
        .eq('user_id', user.id);

      if (favoritesError) throw favoritesError;
      const favoriteIds = new Set(favoritesData?.map(fav => fav.exercise_id) || []);

      let query = supabase.from('exercises').select('*');

      if (excludeExercises.length > 0) {
        query = query.not('id', 'in', `(${excludeExercises.join(',')})`);
      }

      let fetchedExercises: Exercise[] = [];

      if (category === 'all') {
        const { data, error } = await query.order('name');
        if (error) throw error;
        fetchedExercises = data || [];
      }
      else if (category === 'favorite') {
         if (favoriteIds.size > 0) {
          const { data, error } = await query
            .in('id', Array.from(favoriteIds))
            .order('name');
          if (error) throw error;
          fetchedExercises = data?.map(ex => ({ ...ex, is_favorite: true })) || [];
        } else {
          fetchedExercises = [];
        }
      }
      else if (category === 'frequent') {
        const { data: frequentIdsData, error: rpcError } = await supabase
          .rpc('get_frequent_exercises');

        if (rpcError) throw rpcError;

        if (frequentIdsData && frequentIdsData.length > 0) {
          const exerciseIds = frequentIdsData.map((item: any) => item.exercise_id);
          const validIds = exerciseIds.filter((id: string) => !excludeExercises.includes(id));

          if (validIds.length > 0) {
            const { data, error } = await supabase
              .from('exercises')
              .select('*')
              .in('id', validIds)
              .order('name');
            if (error) throw error;
            fetchedExercises = data || [];
          } else {
            fetchedExercises = [];
          }
        } else {
          fetchedExercises = [];
        }
      }

      if (category !== 'favorite') {
        fetchedExercises = fetchedExercises.map(exercise => ({
          ...exercise,
          is_favorite: favoriteIds.has(exercise.id)
        }));
      }
      
      let initiallyFiltered = [...fetchedExercises];
      if (currentSearchQuery && currentSearchQuery.length >= 1) {
        initiallyFiltered = initiallyFiltered.filter(exercise =>
          exercise.name.toLowerCase().includes(currentSearchQuery.toLowerCase())
        );
      }
      if (currentSelectedMuscle) {
        initiallyFiltered = initiallyFiltered.filter(exercise =>
          exercise.muscle_primary?.includes(currentSelectedMuscle)
        );
      }

      setExercises(fetchedExercises);
      setFilteredExercises(initiallyFiltered);

    } catch (err: any) {
      console.error('Error fetching exercises:', err);
      setError(err.message || 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleMuscleSelect = (muscle: string) => {
    const newMuscle = muscle === selectedMuscle ? '' : muscle;
    setSelectedMuscle(newMuscle);
  };

  const handleCategoryChange = (category: CategoryOption) => {
    setSelectedCategory(category);
  };

  const toggleExerciseSelection = (exerciseId: string) => {
    setSelectedExerciseIds(prev => {
      const existingIndex = prev.findIndex(item => item.id === exerciseId);
      
      if (existingIndex !== -1) {
        return prev.filter(item => item.id !== exerciseId);
      } else {
        return [...prev, {id: exerciseId, order: prev.length}];
      }
    });
  };

  const handleConfirm = () => {
    const sortedSelectedIds = [...selectedExerciseIds].sort((a, b) => a.order - b.order);
    
    const selectedItems: Exercise[] = [];
    
    sortedSelectedIds.forEach(({id}) => {
      const exercise = exercises.find(ex => ex.id === id);
      if (exercise) {
        selectedItems.push(exercise);
      }
    });
    
    onSelect(selectedItems);
    onClose();
  };

  const handleFavoriteToggle = async (exerciseId: string, currentIsFavorite: boolean) => {
    const updateState = (list: Exercise[]) => list.map(ex =>
      ex.id === exerciseId ? { ...ex, is_favorite: !currentIsFavorite } : ex
    );
    setExercises(updateState);
    setFilteredExercises(updateState);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!currentIsFavorite) {
      await supabase.from('user_favorite_exercises').insert({ user_id: user.id, exercise_id: exerciseId });
    } else {
      await supabase.from('user_favorite_exercises').delete().match({ user_id: user.id, exercise_id: exerciseId });
    }
  };

  const renderContent = () => (
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
            <ActivityIndicator size="large" color="#14b8a6" style={{ marginTop: 20 }}/>
          ) : error ? (
             <View style={styles.centeredMessage}>
               <Text style={styles.errorText}>{error}</Text>
               <Pressable style={styles.retryButton} onPress={() => fetchExercises(selectedCategory, searchQuery, selectedMuscle)}>
                 <Text style={styles.retryButtonText}>Retry</Text>
               </Pressable>
             </View>
          ) : filteredExercises.length === 0 ? (
            <View style={styles.centeredMessage}>
              <Text style={styles.statusText}>
                {searchQuery || selectedMuscle ? 'No matching exercises found' : 
                 selectedCategory === 'favorite' ? 'No favorite exercises yet' :
                 selectedCategory === 'frequent' ? 'No frequent exercises recorded yet' :
                 'No exercises found for this category'}
              </Text>
            </View>
          ) : (
            filteredExercises.map((exercise) => {
              const isSelected = selectedExerciseIds.some(item => item.id === exercise.id);
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
                            exercise.muscle_primary.slice(0, 3).map((muscle, index) => (
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
              selectedExerciseIds.length === 0 && styles.addButtonDisabled
            ]}
            onPress={handleConfirm}
            disabled={selectedExerciseIds.length === 0}
          >
            <Text style={[
              styles.addButtonText,
              selectedExerciseIds.length === 0 && styles.addButtonTextDisabled
            ]}>
              Add {selectedExerciseIds.length} Exercise{selectedExerciseIds.length !== 1 ? 's' : ''}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <Modal
        visible={visible}
        transparent={true}
        onRequestClose={onClose}
        animationType="fade"
      >
        <View style={styles.iosOverlay}> 
          <Pressable style={styles.backdrop} onPress={onClose} /> 
          {renderContent()} 
        </View>
      </Modal>
    );
  }

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.androidFakeModalWrapper}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.androidCenteringContainer}>
         {renderContent()} 
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iosOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 26, 25, 0.8)',
  },
  androidFakeModalWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  androidCenteringContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#031A19',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
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
    paddingVertical: Platform.OS === 'web' ? 0 : undefined,
  },
  searchInputWeb: {
  },
  categoryContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  muscleGroupsScroll: {
    maxHeight: 40,
    marginBottom: 12,
  },
  muscleGroupsContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
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
    paddingHorizontal: 16,
    paddingTop: 4,
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
    height: 48,
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
    fontSize: 16,
  },
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 150,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#042f2e',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
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

type Styles = typeof styles;
type StyleValue<K extends keyof Styles> = StyleProp<
  Styles[K] extends ViewStyle ? ViewStyle :
  Styles[K] extends TextStyle ? TextStyle :
  Styles[K] extends ImageStyle ? ImageStyle : never
>;

const typedStyles: { [K in keyof Styles]: StyleValue<K> } = styles;