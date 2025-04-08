import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import TimeFilter, { TimePeriod } from '../../components/TimeFilter';
import BarChartCard from '../../components/BarChartCard';
import WorkoutsDurationChartCard from '../../components/WorkoutsDurationChartCard';
import SetsChartCard from '../../components/SetsChartCard';
import WeightLiftedChartCard from '../../components/WeightLiftedChartCard';
import MuscularDistributionChartCard from '../../components/MuscularDistributionChartCard';

export default function StatisticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('7D');

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
        
        <MuscularDistributionChartCard period={selectedPeriod} />
        
        <WeightLiftedChartCard period={selectedPeriod} />
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