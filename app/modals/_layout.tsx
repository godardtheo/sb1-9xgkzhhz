import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="programs" />
      <Stack.Screen name="workouts" />
    </Stack>
  );
}