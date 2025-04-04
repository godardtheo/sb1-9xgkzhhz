import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import TimeFilter, { TimePeriod } from '../../components/TimeFilter';
import PieChartCard from '../../components/PieChartCard';
import BarChartCard from '../../components/BarChartCard';
import WorkoutsDurationChartCard from '../../components/WorkoutsDurationChartCard';

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

  // Sample data for sets bar chart
  const setsData = [
    { date: '2023-04-01', value: 18 },
    { date: '2023-04-02', value: 0 },
    { date: '2023-04-03', value: 12 },
    { date: '2023-04-04', value: 15 },
    { date: '2023-04-05', value: 0 },
    { date: '2023-04-06', value: 8 },
    { date: '2023-04-07', value: 20 },
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

        <BarChartCard
          title="Sets"
          metrics={[
            { label: 'Total', value: '73' },
            { label: 'Average/workout', value: '9.1' },
          ]}
          data={setsData}
          period={selectedPeriod}
        />
        
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