import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { TrendingUp, Calendar, Award, Plus, Dumbbell, Scale, Timer } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserName(data.username || 'there');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserName('there');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Hello </Text>
            <Text style={styles.name}>{userName}</Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.cardTitle}>Training</Text>
          <Text style={styles.cardSubtitle}>Mar 5 - Now</Text>
          <View style={styles.strengthGraph}>
            <View style={[styles.strengthBar, { height: 20 }]} />
            <View style={[styles.strengthBar, { height: 30 }]} />
            <View style={[styles.strengthBar, { height: 40 }]} />
            <View style={[styles.strengthBar, { height: 50 }]} />
            <View style={[styles.strengthBar, { height: 60 }]} />
            <View style={[styles.strengthBar, { height: 70 }]} />
            <View style={[styles.strengthBar, { height: 80 }]} />
          </View>
          <Text style={styles.strengthText}>+15.5% STRENGTH</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Workout</Text>
          <View style={styles.workoutCard}>
            <Text style={styles.workoutTitle}>Optimized split</Text>
            <Text style={styles.workoutDetails}>8 exercises • 72 min</Text>
            <View style={styles.exerciseIcons}>
              {/* Exercise icons would go here */}
            </View>
            <Pressable style={styles.continueButton}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Pressable style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Dumbbell size={24} color="#021a19" />
            </View>
            <Text style={styles.actionLabel}>New Workout</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Scale size={24} color="#021a19" />
            </View>
            <Text style={styles.actionLabel}>Log Weight</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Timer size={24} color="#021a19" />
            </View>
            <Text style={styles.actionLabel}>Rest Timer</Text>
          </Pressable>
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
    paddingBottom: 100,
  },
  header: {
    padding: 24,
    paddingTop: 60,
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
  mainCard: {
    backgroundColor: '#0d3d56',
    margin: 16,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    opacity: 0.8,
    marginBottom: 20,
  },
  strengthGraph: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 8,
    marginBottom: 16,
  },
  strengthBar: {
    width: 8,
    backgroundColor: '#14b8a6',
    borderRadius: 4,
    flex: 1,
  },
  strengthText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#14b8a6',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 16,
  },
  workoutCard: {
    backgroundColor: '#0f766e',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  workoutTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 8,
  },
  workoutDetails: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    opacity: 0.8,
    marginBottom: 20,
  },
  exerciseIcons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  continueButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#021a19',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  actionButton: {
    width: 100,
    height: 100,
    backgroundColor: '#0f766e',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#14b8a6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    textAlign: 'center',
  },
});