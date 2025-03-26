import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function LogWorkoutCard() {
  const router = useRouter();

  const handlePress = () => {
    // Navigate to LiveWorkoutModal with no template ID
    router.push('/modals/live-workout');
  };

  return (
    <Pressable style={styles.logWorkoutCard} onPress={handlePress}>
      <View style={styles.cardIcon}>
        <Plus size={24} color="#021a19" />
      </View>
      <Text style={styles.cardTitle}>Log Workout</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  logWorkoutCard: {
    backgroundColor: '#0f766e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#14b8a6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#ccfbf1',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});
