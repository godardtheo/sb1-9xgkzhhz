import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export type TimePeriod = '7D' | '14D' | '1M' | '12M' | 'ALL';

interface TimeFilterProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}

const periods: TimePeriod[] = ['7D', '14D', '1M', '12M', 'ALL'];

export default function TimeFilter({ selectedPeriod, onPeriodChange }: TimeFilterProps) {
  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {periods.map((period) => (
          <Pressable
            key={period}
            style={[
              styles.filterButton,
              selectedPeriod === period && styles.filterButtonActive,
            ]}
            onPress={() => onPeriodChange(period)}
          >
            <Text
              style={[
                styles.filterText,
                selectedPeriod === period && styles.filterTextActive,
              ]}
            >
              {period}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#0d3d56',
    borderRadius: 12,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
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