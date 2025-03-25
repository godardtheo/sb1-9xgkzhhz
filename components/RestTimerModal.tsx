import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import Animated, {
  FadeIn,
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated';

type Props = {
  visible: boolean;
  onClose: () => void;
  onTimeSelected: (seconds: number) => void;
  currentTime: number;
};

export default function RestTimerModal({
  visible,
  onClose,
  onTimeSelected,
  currentTime,
}: Props) {
  // Common rest times in seconds
  const restTimeOptions = [
    { label: '30s', value: 30 },
    { label: '1m', value: 60 },
    { label: '1.5m', value: 90 },
    { label: '2m', value: 120 },
    { label: '3m', value: 180 },
    { label: '5m', value: 300 },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={styles.modalContainer}
          entering={SlideInUp.springify().damping(15)}
          exiting={SlideOutDown.springify().damping(15)}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Rest Timer</Text>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color="#5eead4" />
            </Pressable>
          </View>

          <View style={styles.timeGrid}>
            {restTimeOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.timeOption,
                  currentTime === option.value && styles.selectedTimeOption,
                ]}
                onPress={() => onTimeSelected(option.value)}
              >
                <Text
                  style={[
                    styles.timeText,
                    currentTime === option.value && styles.selectedTimeText,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 26, 25, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#115e59',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#5eead4',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  closeButton: {
    padding: 4,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    gap: 16,
  },
  timeOption: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#0d3d56',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTimeOption: {
    backgroundColor: '#14b8a6',
  },
  timeText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#5eead4',
  },
  selectedTimeText: {
    color: '#021a19',
  },
});
