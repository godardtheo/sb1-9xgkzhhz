import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#021a19' }
    }}>
      <Stack.Screen name="programs" />
      <Stack.Screen name="workouts" />
      <Stack.Screen name="workout-history" />
      <Stack.Screen name="body-weight" />
    </Stack>
  );
}