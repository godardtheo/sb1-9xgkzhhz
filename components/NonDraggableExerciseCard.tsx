import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

type Exercise = {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  instructions?: string;
  video_url?: string;
  type?: string;
  difficulty?: string;
  sets: {
    id: string;
    minReps: string;
    maxReps: string;
  }[];
};

type Props = {
  exercise: Exercise;
  index: number;
};

export default function NonDraggableExerciseCard({ exercise, index }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.exerciseDetails}>
            <Text style={styles.exerciseStats}>
              {exercise.sets.length} sets • {exercise.muscle}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.setsContainer}>
        {exercise.sets.map((set, setIndex) => (
          <View key={`${exercise.id}-set-${set.id}-${setIndex}`} style={styles.setRow}>
            <Text style={styles.setNumber}>{setIndex + 1}</Text>
            <Text style={styles.setText}>{set.minReps}</Text>
            <Text style={styles.setText}>to</Text>
            <Text style={styles.setText}>{set.maxReps}</Text>
            <Text style={styles.setText}>reps</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 16,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  exerciseDetails: {
    marginBottom: 8,
  },
  exerciseStats: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  setsContainer: {
    gap: 12,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setNumber: {
    width: 24,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    textAlign: 'center',
  },
  setText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
});