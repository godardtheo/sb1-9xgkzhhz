import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExerciseSet {
  weight: string;
  reps: string;
  completed: boolean;
}

interface NonDraggableDoneExerciseProps {
  exercise: {
    id: string;
    name: string;
    sets: ExerciseSet[];
  };
  exerciseId: string;
  onPress: (exerciseId: string) => void;
  weightUnit: string;
}

export default function NonDraggableDoneExercise({ exercise, exerciseId, onPress, weightUnit }: NonDraggableDoneExerciseProps) {
  return (
    <Pressable 
      style={styles.container}
      onPress={() => { /* Ne fait plus rien au clic */ }}
    >
      {/* Exercise Header */}
      <View style={styles.header}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Ionicons name="chevron-forward" size={20} color="#5eead4" />
      </View>
      
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.headerLabel}>Set</Text>
        <Text style={styles.headerLabel}>Weight</Text>
        <Text style={styles.headerLabel}>Reps</Text>
      </View>
      
      {/* Exercise Sets */}
      {exercise.sets.map((set, index) => (
        <View key={index} style={styles.setRow}>
          <Text style={styles.setText}>{index + 1}</Text>
          <Text style={styles.setText}>{set.weight} {weightUnit}</Text>
          <Text style={styles.setText}>{set.reps}</Text>
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#042f2e',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(94, 234, 212, 0.2)',
  },
  headerLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  setText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ccfbf1',
  }
}); 