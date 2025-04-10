import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';

export type MuscleGroup = 
  | 'all' 
  | 'chest' 
  | 'back' 
  | 'shoulders' 
  | 'biceps' 
  | 'triceps' 
  | 'legs' 
  | 'core' 
  | 'cardio';

interface MuscleGroupFilterProps {
  selectedMuscleGroup: MuscleGroup;
  onMuscleGroupChange: (muscleGroup: MuscleGroup) => void;
}

const muscleGroups: { id: MuscleGroup; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'legs', label: 'Legs' },
  { id: 'core', label: 'Core' },
  { id: 'cardio', label: 'Cardio' },
];

export default function MuscleGroupFilter({ 
  selectedMuscleGroup, 
  onMuscleGroupChange 
}: MuscleGroupFilterProps) {
  
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.filterContainer}>
          {muscleGroups.map((muscleGroup) => (
            <Pressable
              key={muscleGroup.id}
              style={[
                styles.filterButton,
                selectedMuscleGroup === muscleGroup.id && styles.filterButtonActive,
              ]}
              onPress={() => onMuscleGroupChange(muscleGroup.id)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedMuscleGroup === muscleGroup.id && styles.filterTextActive,
                ]}
              >
                {muscleGroup.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    marginBottom: 16,
  },
  scrollContainer: {
    paddingHorizontal: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#0d3d56',
    borderRadius: 12,
    padding: 4,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#14b8a6',
  },
  filterText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  filterTextActive: {
    color: '#021a19',
  },
}); 