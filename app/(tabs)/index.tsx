import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth/store';
import CurrentProgramCard from '@/components/CurrentProgramCard';
import HistoryHomeCard from '@/components/HistoryHomeCard';
import NewWorkoutCard from '@/components/NewWorkoutCard';
import LogWeightCard from '@/components/LogWeightCard';
import ChooseWorkoutModal from '@/components/ChooseWorkoutModal';

export default function HomeScreen() {
  const { userProfile, fetchUserProfile } = useAuthStore();
  const username = userProfile?.username || 'there';
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);

  useEffect(() => {
    // Attempt to fetch/refresh user profile when the component mounts
    if (!userProfile) {
      fetchUserProfile();
    }
  }, [fetchUserProfile, userProfile]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Hello </Text>
            <Text style={styles.name}>{username}</Text>
          </View>
        </View>

        {/* Current Program Card */}
        <View style={styles.cardWrapper}>
          <CurrentProgramCard />
        </View>

        {/* History Card */}
        <View style={styles.cardWrapper}>
          <HistoryHomeCard />
        </View>

        {/* Quick Actions - Cards side by side taking full width */}
        <View style={styles.quickActions}>
          <View style={[styles.cardContainer]}>
            <NewWorkoutCard onPress={() => setShowWorkoutModal(true)} />
          </View>
          <View style={styles.spacer} />
          <View style={[styles.cardContainer]}>
            <LogWeightCard />
          </View>
        </View>
      </ScrollView>

      {/* Workout Selection Modal */}
      <ChooseWorkoutModal 
        visible={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
      />
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
    paddingVertical: 60,
    paddingBottom: 100,
    gap: 4, // Consistent vertical spacing between elements
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 32,
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
  cardWrapper: {
    paddingHorizontal: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  cardContainer: {
    flex: 1,
  },
  spacer: {
    width: 16, // Same as the vertical gap between elements
  },
});