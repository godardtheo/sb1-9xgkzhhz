import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Dumbbell, Search, ChevronRight, Info, X, CalendarCog } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { searchExercises, getExercisesByMuscleGroup } from '../../lib/api/exerciseDb';
import { useRouter } from 'expo-router';

export default function ActionScreen() {
  const router = useRouter();
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const muscleGroups = [
    'chest', 'back', 'shoulders', 'legs', 'arms', 'core'
  ];

  useEffect(() => {
    if (selectedMuscle) {
      loadExercises();
    }
  }, [selectedMuscle]);

  async function loadExercises() {
    try {
      setLoading(true);
      setError(null);
      const data = await getExercisesByMuscleGroup(selectedMuscle);
      setExercises(data);
    } catch (err) {
      setError('Failed to load exercises');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleInfoPress = () => {
    setShowInfo(true);
  };

  const handleOverlayPress = () => {
    setShowInfo(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.titleContent}>
              <Text style={styles.title}>Trainings</Text>
              <Text style={styles.subtitle}>Manage your workouts and programs</Text>
            </View>
            <Pressable 
              style={styles.infoButton}
              onPress={handleInfoPress}
            >
              <Info size={24} color="#5eead4" />
            </Pressable>
          </View>
        </View>
        
        <View style={styles.quickActions}>
          <Pressable 
            style={styles.actionCard}
            onPress={() => router.push('/modals/workouts')}
          >
            <View style={styles.actionIconContainer}>
              <Dumbbell size={24} color="#042f2e" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Workouts</Text>
              <Text style={styles.actionSubtitle}>Manage your workout sessions</Text>
            </View>
            <ChevronRight size={20} color="#5eead4" />
          </Pressable>

          <Pressable 
            style={styles.actionCard}
            onPress={() => router.push('/modals/programs')}
          >
            <View style={[styles.actionIconContainer, styles.programsIcon]}>
              <CalendarCog size={24} color="#042f2e" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Programs</Text>
              <Text style={styles.actionSubtitle}>Schedule your trainings</Text>
            </View>
            <ChevronRight size={20} color="#5eead4" />
          </Pressable>
        </View>
      </ScrollView>

      {showInfo && (
        <Pressable style={styles.overlay} onPress={handleOverlayPress}>
          <View style={styles.infoContainer}>
            <Pressable 
              style={styles.closeButton} 
              onPress={() => setShowInfo(false)}
              hitSlop={8}
            >
              <X size={20} color="#ffffff" />
            </Pressable>
            <Text style={styles.infoText}>
              Create your own workouts in the Workouts section and add them to your tailor-made programs in the Programs section
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  infoButton: {
    padding: 8,
    marginLeft: 16,
    marginTop: 4,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 26, 25, 0.8)',
    justifyContent: 'flex-start',
  },
  infoContainer: {
    backgroundColor: '#115e59',
    padding: 20,
    paddingRight: 48,
    marginTop: 120,
    marginHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  infoText: {
    color: '#ccfbf1',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  quickActions: {
    marginBottom: 32,
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 16,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5eead4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  programsIcon: {
    backgroundColor: '#5eead4',
  },
  actionContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  exerciseSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#115e59',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  searchPlaceholder: {
    color: '#5eead4',
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  muscleGroupsScroll: {
    marginBottom: 16,
  },
  muscleGroupsContent: {
    paddingRight: 16,
  },
  muscleGroupButton: {
    backgroundColor: '#115e59',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedMuscleGroup: {
    backgroundColor: '#14b8a6',
  },
  muscleGroupText: {
    color: '#5eead4',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  selectedMuscleGroupText: {
    color: '#042f2e',
  },
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#115e59',
    borderRadius: 12,
    padding: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: '#ccfbf1',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  exerciseDetail: {
    color: '#5eead4',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  statusText: {
    color: '#5eead4',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Inter-Regular',
  },
});