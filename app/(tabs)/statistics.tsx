import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import TimeFilter, { TimePeriod } from '../../components/TimeFilter';
import PieChartCard from '../../components/PieChartCard';
import BarChartCard from '../../components/BarChartCard';
import WorkoutsDurationChartCard from '../../components/WorkoutsDurationChartCard';
import SetsChartCard from '../../components/SetsChartCard';
import WeightLiftedChartCard from '../../components/WeightLiftedChartCard';

export default function StatisticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('7D');

  // Sample data for muscle breakdown pie chart
  const muscleData = [
    { name: 'Chest', value: 25, color: '#14b8a6' },
    { name: 'Back', value: 30, color: '#0d9488' },
    { name: 'Legs', value: 20, color: '#0f766e' },
    { name: 'Shoulders', value: 15, color: '#115e59' },
    { name: 'Arms', value: 10, color: '#134e4a' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Statistics</Text>
        </View>
        
        <TimeFilter
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
        
        <WorkoutsDurationChartCard period={selectedPeriod} />
        
        <SetsChartCard period={selectedPeriod} />
        
        <WeightLiftedChartCard period={selectedPeriod} />
        
        <PieChartCard
          title="Muscle Breakdown"
          metrics={[
            { label: 'Total Sets', value: '156' },
            { label: 'Most Trained', value: 'Back' },
          ]}
          data={muscleData}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100, // Add padding to prevent overlap with bottom navigation
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
  },
});