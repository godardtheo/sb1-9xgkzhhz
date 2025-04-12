import { Tabs } from 'expo-router';
import { Chrome as Dashboard, ChartBar as Statistics, CircleUser as UserProfile, Plus, Dumbbell as Exercises } from 'lucide-react-native';
import { View, StyleSheet, Platform } from 'react-native';
import ResumeTrainingButton from '@/components/ResumeTrainingButton';
import { useWorkoutProgressStore } from '@/lib/store/workoutProgressStore';

export default function TabLayout() {
  const isWorkoutInProgress = useWorkoutProgressStore(state => state.isWorkoutInProgress);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => (
            <View style={[StyleSheet.absoluteFill, styles.tabBarBackground]} />
          ),
          tabBarShowLabel: false,
          tabBarActiveTintColor: '#14b8a6',
          tabBarInactiveTintColor: '#5eead4',
        }}>
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color, size }) => (
              <View style={styles.iconContainer}>
                <Dashboard size={24} color={color} strokeWidth={2.5} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="statistics"
          options={{
            tabBarIcon: ({ color, size }) => (
              <View style={styles.iconContainer}>
                <Statistics size={24} color={color} strokeWidth={2.5} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="exercises"
          options={{
            tabBarIcon: ({ color, size }) => (
              <View style={styles.iconContainer}>
                <Exercises size={24} color={color} strokeWidth={2.5} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ color, size }) => (
              <View style={styles.iconContainer}>
                <UserProfile size={24} color={color} strokeWidth={2.5} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="action"
          options={{
            tabBarIcon: () => (
              <View style={styles.iconContainer}>
                <View style={styles.actionButton}>
                  <Plus size={22} color="#021a19" strokeWidth={3} />
                </View>
              </View>
            ),
          }}
        />
      </Tabs>
      
      {/* Show the Resume Training Button when a workout is in progress */}
      {isWorkoutInProgress && <ResumeTrainingButton />}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    height: 68,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  tabBarBackground: {
    backgroundColor: '#021a19',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
      },
    }),
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
  },
  actionButton: {
    width: 42,
    height: 42,
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
});