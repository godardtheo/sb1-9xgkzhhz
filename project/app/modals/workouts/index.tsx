import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, ArrowLeft, X, Plus, ChevronRight } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useWorkoutStore } from '@/lib/store/workoutStore';

type Workout = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  estimated_duration: string;
  exercise_count: number;
  set_count: number;
};

export default function WorkoutsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const { workouts, loading, error, fetchWorkouts, needsRefresh } = useWorkoutStore();

  const muscleGroups = [
    'chest', 'back', 'shoulders', 'legs', 'core', 'biceps', 'triceps'
  ];

  useEffect(() => {
    fetchWorkouts();
  }, []);

  useEffect(() => {
    if (needsRefresh) {
      fetchWorkouts();
    }
  }, [needsRefresh]);

  const toggleMuscleFilter = (muscle: string) => {
    setSelectedMuscles(prev => 
      prev.includes(muscle)
        ? prev.filter(m => m !== muscle)
        : [...prev, muscle]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable 
            onPress={() => router.push('/(tabs)/action')}
            style={styles.backButton}
            hitSlop={8}
          >
            <ArrowLeft size={24} color="#5eead4" />
          </Pressable>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>My Workouts</Text>
            <Text style={styles.subtitle}>Manage your workout sessions</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#5eead4" />
          <TextInput
            style={[styles.searchInput, Platform.OS === 'web' && styles.searchInputWeb]}
            placeholder="Search workouts..."
            placeholderTextColor="#5eead4"
            value={searchQuery}
            onChangeText={setSearchQuery}
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
                selectedMuscles.includes(muscle) && styles.selectedMuscleGroup
              ]}
              onPress={() => toggleMuscleFilter(muscle)}
            >
              <Text style={[
                styles.muscleGroupText,
                selectedMuscles.includes(muscle) && styles.selectedMuscleGroupText
              ]}>
                {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.workoutsList}
        contentContainerStyle={styles.workoutsListContent}
      >
        {loading ? (
          <Text style={styles.statusText}>Loading workouts...</Text>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : workouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No workouts found</Text>
            <Text style={styles.emptyStateText}>
              Create your first workout template to get started
            </Text>
          </View>
        ) : (
          workouts.map((workout) => (
            <Pressable 
              key={workout.id} 
              style={styles.workoutCard}
              onPress={() => router.push(`/modals/workouts/${workout.id}`)}
            >
              <View style={styles.workoutContent}>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <View style={styles.workoutDetails}>
                    <Text style={styles.workoutStats}>
                      {workout.exercise_count} exercises  •  {workout.set_count} sets  •  {workout.estimated_duration}
                    </Text>
                  </View>
                  <View style={styles.muscleChips}>
                    {workout.muscles.slice(0, 3).map((muscle, index) => (
                      <View key={muscle} style={styles.muscleChip}>
                        <Text style={styles.muscleChipText}>
                          {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                        </Text>
                      </View>
                    ))}
                    {workout.muscles.length > 3 && (
                      <View style={[styles.muscleChip, styles.moreChip]}>
                        <Text style={styles.muscleChipText}>
                          +{workout.muscles.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.chevronContainer}>
                  <ChevronRight size={20} color="#5eead4" />
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomButtonContainer}>
        <Pressable 
          style={styles.newWorkoutButton}
          onPress={() => router.push('/modals/workouts/new')}
        >
          <Plus size={20} color="#021a19" />
          <Text style={styles.newWorkoutButtonText}>New Workout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  header: {
    paddingTop: Platform.OS === 'web' ? 40 : 60,
    paddingHorizontal: 24,
    backgroundColor: '#021a19',
    borderBottomWidth: 1,
    borderBottomColor: '#115e59',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
    marginTop: 4,
  },
  titleContainer: {
    flex: 1,
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
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#ccfbf1',
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },
  workoutCard: {
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  workoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutInfo: {
    flex: 1,
    marginRight: 16,
  },
  workoutName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  workoutDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  workoutStats: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  muscleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleChip: {
    backgroundColor: '#0d3d56',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  moreChip: {
    backgroundColor: '#134e4a',
  },
  muscleChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    textAlign: 'center',
  },
  statusText: {
    color: '#5eead4',
    textAlign: 'center',
    marginTop: 24,
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 24,
    fontFamily: 'Inter-Regular',
  },
  bottomButtonContainer: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  newWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14b8a6',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    minHeight: 56,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  newWorkoutButtonText: {
    color: '#021a19',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});