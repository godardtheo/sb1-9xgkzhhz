import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';

export type CategoryOption = 'all' | 'frequent' | 'favorite' | 'my_exercises';

interface CategoryFilterProps {
  selectedCategory: CategoryOption;
  onCategoryChange: (category: CategoryOption) => void;
}

const categories: { id: CategoryOption; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'frequent', label: 'Frequent' },
  { id: 'favorite', label: 'Favorite' },
];

export default function CategoryFilter({ 
  selectedCategory, 
  onCategoryChange 
}: CategoryFilterProps) {
  
  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            style={[
              styles.filterButton,
              selectedCategory === category.id && styles.filterButtonActive,
            ]}
            onPress={() => onCategoryChange(category.id)}
          >
            <Text
              style={[
                styles.filterText,
                selectedCategory === category.id && styles.filterTextActive,
              ]}
            >
              {category.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    marginBottom: Platform.OS === 'android' ? 12 : 16,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#0d3d56',
    borderRadius: 12,
    padding: Platform.OS === 'android' ? 2 : 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 6 : 8,
    paddingHorizontal: 12,
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