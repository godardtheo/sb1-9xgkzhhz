import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MuscleGroupFilter, { MuscleGroup } from './MuscleGroupFilter';
import CategoryFilter from './CategoryFilter';

export default function MuscleGroupExample() {
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'frequent' | 'favorite'>('all');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Filter Example</Text>
      
      <MuscleGroupFilter 
        selectedMuscleGroup={selectedMuscleGroup}
        onMuscleGroupChange={setSelectedMuscleGroup}
      />
      
      <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      
      <View style={styles.resultContainer}>
        <Text style={styles.resultText}>
          Selected muscle group: <Text style={styles.highlight}>{selectedMuscleGroup}</Text>
        </Text>
        <Text style={styles.resultText}>
          Selected category: <Text style={styles.highlight}>{selectedCategory}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0f1729',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
  },
  resultContainer: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  resultText: {
    color: '#f1f5f9',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  highlight: {
    color: '#14b8a6',
    fontFamily: 'Inter-Medium',
  },
}); 