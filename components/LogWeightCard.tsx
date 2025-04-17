import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, AppState } from 'react-native';
import { Scale } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getLatestWeight } from '@/lib/weightUtils';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export default function LogWeightCard() {
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const router = useRouter();
  const [appState, setAppState] = useState(AppState.currentState);

  // Fetch latest weight when component mounts
  useEffect(() => {
    fetchLatestWeight();

    // Set up AppState listener to refresh when app comes back to foreground
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === "active") {
        // App has come to the foreground
        fetchLatestWeight();
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  // Refresh when screen gains focus (e.g. after returning from body-weight modal)
  useFocusEffect(
    useCallback(() => {
      fetchLatestWeight();
    }, [])
  );

  const fetchLatestWeight = async () => {
    try {
      const weight = await getLatestWeight();
      setLatestWeight(weight);
    } catch (error) {
      console.error('Error fetching latest weight:', error);
    }
  };

  const handlePress = () => {
    router.push('/modals/body-weight');
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
    backgroundColor: '#0d3d56',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
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