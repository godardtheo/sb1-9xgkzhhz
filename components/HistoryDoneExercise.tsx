import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

type ExerciseSet = {
  set_number: number;
  weight: number;
  reps: number;
};

type ExerciseHistory = {
  workout_id: string;
  workout_name: string;
  date: string;
  sets: ExerciseSet[];
};

interface HistoryDoneExerciseProps {
  history: ExerciseHistory;
  onPress: () => void;
  weightUnit?: string;
}

export default function HistoryDoneExercise({ 
  history, 
  onPress,
  weightUnit = 'kg'
}: HistoryDoneExerciseProps) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>{`${history.workout_name} - ${history.date}`}</Text>
        <Pressable 
          onPress={onPress}
          style={styles.historyButton}
          hitSlop={8}
        >
          <ChevronRight size={20} color="#5eead4" />
        </Pressable>
      </View>
      
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.headerLabel}>Set</Text>
        <Text style={styles.headerLabel}>Weight</Text>
        <Text style={styles.headerLabel}>Reps</Text>
      </View>
      
      {/* Sets */}
      {history.sets.map((set, index) => (
        <View key={index} style={styles.setRow}>
          <Text style={styles.setText}>{set.set_number}</Text>
          <Text style={styles.setText}>{`${set.weight} ${weightUnit}`}</Text>
          <Text style={styles.setText}>{set.reps}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  historyCard: {
    backgroundColor: '#042f2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    flex: 1,
  },
  historyButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
}); 