import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: number;
};

export function Checkbox({
  checked,
  onChange,
  disabled = false,
  size = 24,
}: CheckboxProps) {
  // Animation values
  const scale = useSharedValue(1);

  // Animate when checked changes
  React.useEffect(() => {
    if (checked) {
      scale.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(1.1, { duration: 150 }),
        withTiming(1, { duration: 100 })
      );
    }
  }, [checked]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Pressable
      style={[
        styles.container,
        { width: size, height: size },
        checked ? styles.containerChecked : styles.containerUnchecked,
        disabled && styles.containerDisabled,
      ]}
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <Animated.View style={[styles.checkContainer, animatedStyle]}>
        {checked && <Check size={size * 0.6} color="#021a19" strokeWidth={3} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  containerChecked: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  containerUnchecked: {
    backgroundColor: 'transparent',
    borderColor: '#5eead4',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  checkContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
