import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getNextWorkout } from '@/lib/workoutUtils';

type ProgramData = {
  programName: string;
  nextWorkout: { id: string; name: string; template_id: string } | null;
} | null;

export default function CurrentProgramCard() {
  const [programData, setProgramData] = useState<ProgramData>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProgramData();
  }, []);

  const fetchProgramData = async () => {
    try {
      setLoading(true);
      const data = await getNextWorkout();
      setProgramData(data);
    } catch (error) {
      console.error('Error fetching program data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (programData?.nextWorkout) {
      // TODO: Navigate to LiveWorkoutModal when implemented
      console.log('Navigate to workout:', programData.nextWorkout);
      // router.push(`/workout/${programData.nextWorkout.template_id}`);
      alert('LiveWorkoutModal will be implemented later');
    } else {
      // If no next workout, navigate to programs
      router.push('/modals/programs');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading program...</Text>
        </View>
      </View>
    );
  }

  if (!programData) {
    return (
      <View style={styles.container}>
        <Pressable 
          style={styles.content}
          onPress={() => router.push('/modals/programs')}
        >
          <View style={styles.textContent}>
            <Text style={styles.emptyTitle}>No Active Program</Text>
            <Text style={styles.emptySubtitle}>Tap to set up a program</Text>
          </View>
          <ChevronRight size={24} color="#5eead4" />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={styles.content}>
        <View style={styles.textContent}>
          <Text style={styles.title}>{programData.programName}</Text>
          <Text style={styles.subtitle}>
            Next Workout: {programData.nextWorkout ? programData.nextWorkout.name : 'None scheduled'}
          </Text>
        </View>
        <ChevronRight size={24} color="#5eead4" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d3d56',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  loadingContainer: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
});