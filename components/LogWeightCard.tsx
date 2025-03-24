import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Scale } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getLatestWeight } from '@/lib/weightUtils';

export default function LogWeightCard() {
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchLatestWeight();
  }, []);

  const fetchLatestWeight = async () => {
    try {
      const weight = await getLatestWeight();
      setLatestWeight(weight);
    } catch (error) {
      console.error('Error fetching latest weight:', error);
    }
  };

  const handlePress = () => {
    // TODO: Navigate to LogWeightModal when implemented
    alert('LogWeightModal will be implemented later');
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={styles.iconContainer}>
        <Scale size={24} color="#042f2e" />
      </View>
      <Text style={styles.text}>Log Weight</Text>
      {latestWeight && (
        <Text style={styles.weightText}>{latestWeight} kg</Text>
      )}
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
    marginLeft: 8,
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
  weightText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    marginTop: 4,
  },
});