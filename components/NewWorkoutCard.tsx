import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Dumbbell } from 'lucide-react-native';

type Props = {
  onPress: () => void;
};

export default function NewWorkoutCard({ onPress }: Props) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Dumbbell size={24} color="#042f2e" />
      </View>
      <Text style={styles.text}>Start Workout</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d3d56',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: 120,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    textAlign: 'center',
  },
});