import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getNextWorkout } from '@/lib/workoutUtils';

type ProgramData = {
  programName: string;
  nextWorkout: { id: string; name: string; template_id: string } | null;
} | null;

export default function CurrentProgramCard() {
  const [programData, setProgramData] = useState<ProgramData>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchProgramData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getNextWorkout();
      setProgramData(data);
    } catch (error) {
      console.error('Error fetching program data:', error);
      setError('Failed to load program data');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProgramData();

      return () => {
        // Optionnel : nettoyer si fetchProgramData démarre quelque chose qui doit être arrêté
        // Par exemple, si c'était un listener
        // Pour l'instant, on peut laisser vide ou juste réinitialiser l'état si besoin
        // setProgramData(null); // Pour éviter de voir d'anciennes données brièvement
        // setLoading(true); // Pour montrer le loader au prochain focus si les données sont nulles
      };
    }, [fetchProgramData])
  );

  const handlePress = () => {
    if (programData?.nextWorkout) {
      try {
        // Navigate to LiveWorkoutModal with the template ID
        router.push({
          pathname: '/modals/live-workout',
          params: { template_id: programData.nextWorkout.template_id },
        });
      } catch (error) {
        console.error('Navigation error:', error);
        // If navigation fails, retry after a short delay
        setTimeout(() => {
          // router.push('/modals/live-workout?template_id=' + 
          //   encodeURIComponent(programData.nextWorkout!.template_id));
          router.push({
            pathname: '/modals/live-workout',
            params: { template_id: programData.nextWorkout!.template_id },
          });
        }, 100);
      }
    } else {
      // If no next workout, navigate to programs
      router.push('/modals/programs');
    }
  };

  const handleRetry = () => {
    fetchProgramData();
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

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.textContent}>
            <Text style={styles.errorTitle}>Error Loading Program</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
          </View>
          <Pressable onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
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
    <View style={styles.container}>
      <Pressable style={styles.content} onPress={handlePress}>
        <View style={styles.textContent}>
          <Text style={styles.title}>{programData.programName}</Text>
          <Text style={styles.subtitle}>
            Next Workout:{' '}
            {programData.nextWorkout
              ? programData.nextWorkout.name
              : 'None scheduled'}
          </Text>
        </View>
        <ChevronRight size={24} color="#5eead4" />
      </Pressable>
    </View>
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
    minHeight: 90, // Ensure consistent height
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
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ef4444',
    marginBottom: 4,
  },
  errorSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  retryButton: {
    backgroundColor: '#115e59',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    color: '#14b8a6',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  }
});