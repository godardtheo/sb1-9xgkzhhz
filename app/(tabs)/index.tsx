import { View, Text, StyleSheet, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth/store';
import CurrentProgramCard from '@/components/CurrentProgramCard';
import HistoryHomeCard from '@/components/HistoryHomeCard';
import NewWorkoutCard from '@/components/NewWorkoutCard';
import LogWeightCard from '@/components/LogWeightCard';

export default function HomeScreen() {
  const { userProfile, fetchUserProfile } = useAuthStore();
  const username = userProfile?.username || 'there';

  useEffect(() => {
    // Attempt to fetch/refresh user profile when the component mounts
    if (!userProfile) {
      fetchUserProfile();
    }
  }, [fetchUserProfile, userProfile]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Hello </Text>
            <Text style={styles.name}>{username}</Text>
          </View>
        </View>

        {/* Current Program Card */}
        <CurrentProgramCard />

        {/* History Card */}
        <HistoryHomeCard />

        {/* Quick Actions Row */}
        <View style={styles.quickActions}>
          <NewWorkoutCard />
          <LogWeightCard />
        </View>
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
    padding: 16,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  greeting: {
    fontSize: 24,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});