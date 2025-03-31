import React from 'react';
import { StyleSheet, Text, Pressable, Animated, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { PlayCircle } from 'lucide-react-native';
import { useWorkoutProgressStore } from '@/lib/store/workoutProgressStore';
import { useEffect, useRef } from 'react';

export default function ResumeTrainingButton() {
  const router = useRouter();
  const { workoutName, getCurrentDuration } = useWorkoutProgressStore();
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Start pulse animation when component mounts
  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Create pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Cleanup animation on unmount
    return () => {
      pulseAnim.stopAnimation();
    };
  }, []);
  
  // Format the current duration for display (MM:SS)
  const formatTime = () => {
    const duration = getCurrentDuration();
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handlePress = () => {
    router.push('/modals/live-workout');
  };
  
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: pulseAnim }],
        }
      ]}
    >
      <Pressable 
        style={styles.button}
        onPress={handlePress}
        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
      >
        <PlayCircle size={24} color="#042f2e" />
        <View style={styles.textContainer}>
          <Text style={styles.actionText}>Resume Workout</Text>
          <Text style={styles.infoText}>{workoutName} • {formatTime()}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // Position above the tab bar
    left: 16,
    right: 16,
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      },
    }),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  actionText: {
    color: '#042f2e',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  infoText: {
    color: '#042f2e',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    opacity: 0.8,
  },
});