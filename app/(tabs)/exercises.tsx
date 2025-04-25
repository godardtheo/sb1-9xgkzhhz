import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { Search, Plus } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import CategoryFilter, { CategoryOption } from '@/components/CategoryFilter';
import ExerciseCard from '@/components/ExerciseCard';

type Exercise = {
  id: string;
  name: string;
  muscle_primary: string[];
  equipment: string;
  is_favorite?: boolean;
  instructions?: string;
  video_url?: string;
  type?: string;
  difficulty?: string;
};

export default function ExercisesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>('all');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hardcoded list of muscle groups from the database enum
  const muscleGroups = [
    'chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'biceps', 
    'triceps', 'forearms', 'abs', 'obliques', 'quads', 'hamstrings', 
    'calves', 'glutes', 'full_body'
  ];

  useEffect(() => {
    fetchExercises();
  }, [selectedCategory]);

  useEffect(() => {
    filterExercises();
  }, [exercises, searchQuery, selectedMuscle, selectedCategory]);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // First, get all user favorites to create a lookup map
      const { data: favorites, error: favoritesError } = await supabase
        .from('user_favorite_exercises')
        .select('exercise_id')
        .eq('user_id', user.id);

      if (favoritesError) throw favoritesError;
      
      // Create a Set of favorite exercise IDs for fast lookup
      const favoriteIds = new Set();
      favorites?.forEach(fav => favoriteIds.add(fav.exercise_id));

      if (selectedCategory === 'all') {
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        // Add is_favorite property to each exercise
        const exercisesWithFavorites = data?.map(exercise => ({
          ...exercise,
          is_favorite: favoriteIds.has(exercise.id)
        })) || [];
        
        setExercises(exercisesWithFavorites);
      } 
      else if (selectedCategory === 'favorite') {
        if (favorites?.length > 0) {
          const exerciseIds = favorites.map(fav => fav.exercise_id);
          
          const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .in('id', exerciseIds)
            .order('name');
          
          if (error) throw error;
          
          // Add is_favorite flag
          const exercisesWithFavorites = data?.map(exercise => ({
            ...exercise,
            is_favorite: true
          })) || [];
          
          setExercises(exercisesWithFavorites);
        } else {
          setExercises([]);
        }
      }
      else if (selectedCategory === 'frequent') {
        // Using the RPC function we created
        const { data: frequentIds, error: rpcError } = await supabase
          .rpc('get_frequent_exercises');
        
        if (rpcError) throw rpcError;
        
        if (frequentIds && frequentIds.length > 0) {
          const exerciseIds = frequentIds.map((item: any) => item.exercise_id);
          
          const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .in('id', exerciseIds)
            .order('name');
          
          if (error) throw error;
          
          // Add is_favorite property to each exercise
          const exercisesWithFavorites = data?.map(exercise => ({
            ...exercise,
            is_favorite: favoriteIds.has(exercise.id)
          })) || [];
          
          setExercises(exercisesWithFavorites);
        } else {
          setExercises([]);
        }
      }
      else if (selectedCategory === 'my_exercises') {
        // Placeholder for user-created exercises
        // This would need a field in the database to identify user-created exercises
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          // .eq('created_by_user', true) // Example field that would need to be added
          .order('name');
        
        if (error) throw error;
        
        // Add is_favorite property to each exercise
        const exercisesWithFavorites = data?.map(exercise => ({
          ...exercise,
          is_favorite: favoriteIds.has(exercise.id)
        })) || [];
        
        setExercises(exercisesWithFavorites);
      }
    } catch (error: any) {
      console.error('Error fetching exercises:', error);
      setError(error.message || 'Failed to load exercises');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterExercises = () => {
    let filtered = [...exercises];

    // Filter by search query
    if (searchQuery && searchQuery.length >= 2) {
      filtered = filtered.filter(exercise => 
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by muscle group
    if (selectedMuscle) {
      filtered = filtered.filter(exercise => 
        exercise.muscle_primary && exercise.muscle_primary.includes(selectedMuscle)
      );
    }

    setFilteredExercises(filtered);
  };

  const handleMuscleSelect = (muscle: string) => {
    setSelectedMuscle(muscle === selectedMuscle ? '' : muscle);
  };

  const handleCategoryChange = (category: CategoryOption) => {
    setSelectedCategory(category);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchExercises();
  }, [selectedCategory]);

  const handleExercisePress = (exercise: Exercise) => {
    // Navigate to the exercise details screen instead of showing modal
    router.push(`/modals/exercise-details/${exercise.id}`);
  };

  const handleAddExercise = () => {
    // Navigation to add new exercise will be implemented later
    console.log('Add new exercise');
    // router.push('/modals/new-exercise');
  };

  // Render each exercise item
  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <ExerciseCard
      id={item.id}
      name={item.name}
      muscle_primary={item.muscle_primary}
      isFavorite={!!item.is_favorite}
      onPress={() => handleExercisePress(item)}
      onFavoriteToggle={handleFavoriteToggle}
    />
  );

  // Handler for favorite toggling
  const handleFavoriteToggle = (exerciseId: string, isFavorite: boolean) => {
    // Update both exercises and filteredExercises arrays to reflect the change immediately
    setExercises(prevExercises => 
      prevExercises.map(exercise => 
        exercise.id === exerciseId 
          ? { ...exercise, is_favorite: isFavorite } 
          : exercise
      )
    );
    
    setFilteredExercises(prevFiltered => 
      prevFiltered.map(exercise => 
        exercise.id === exerciseId 
          ? { ...exercise, is_favorite: isFavorite } 
          : exercise
      )
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (loading) return null;
    
    let message = 'No exercises found';
    if (searchQuery && selectedMuscle) {
      message = `No exercises found for "${searchQuery}" in ${selectedMuscle}`;
    } else if (searchQuery) {
      message = `No exercises found for "${searchQuery}"`;
    } else if (selectedMuscle) {
      message = `No exercises found for ${selectedMuscle}`;
    } else if (selectedCategory === 'favorite') {
      message = 'No favorite exercises yet. Tap the star icon to add favorites.';
    } else if (selectedCategory === 'frequent') {
      message = 'No frequent exercises yet. Start using exercises in your workouts.';
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Exercises</Text>
          <Text style={styles.subtitle}>The exercise library to get stronger</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#5eead4" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises"
          placeholderTextColor="#5eead4"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filtersContainer}>
        <CategoryFilter 
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />
        
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
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchExercises}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredExercises}
          renderItem={renderExerciseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#14b8a6']}
              tintColor="#14b8a6"
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    marginBottom: 24,
  },
  titleContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#115e59',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ccfbf1',
  },
  filtersContainer: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  muscleGroupsScroll: {
    marginBottom: 16,
  },
  muscleGroupsContent: {
    paddingRight: 16,
  },
  muscleGroupButton: {
    backgroundColor: '#115e59',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 16,
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
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 80, // Add padding for floating button
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 200,
  },
  emptyText: {
    color: '#5eead4',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
}); 