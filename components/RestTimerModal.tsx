import React from 'react'; // Added React import to fix the "React is not defined" error
import { View, Text, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { X, Volume2, VolumeX } from 'lucide-react-native';
import { useState } from 'react';
import Animated, {
  FadeIn,
  SlideInUp,
  SlideOutDown, 
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  visible: boolean;
  onClose: () => void;
  onTimeSelected: (seconds: number) => void;
  currentTime: number;
  playSoundOnFinish: boolean;
  onSoundToggle: () => void;
};

export default function RestTimerModal({
  visible,
  onClose,
  onTimeSelected,
  currentTime,
  playSoundOnFinish,
  onSoundToggle,
}: Props) {
  // Common rest times in seconds
  const restTimeOptions = [
    { label: '0:30', value: 30 },
    { label: '1:00', value: 60 },
    { label: '1:30', value: 90 },
    { label: '2:00', value: 120 },
    { label: '3:00', value: 180 },
    { label: '5:00', value: 300 },
  ];

  const translateY = useSharedValue(300);

  // When the modal becomes visible, animate from bottom to top
  React.useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
    } else {
      translateY.value = withTiming(300, { duration: 300 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  // Common content renderer
  const renderContent = () => (
    <Animated.View
      style={[styles.modalContainer, animatedStyle]}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>Rest Timer</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={onSoundToggle}
            style={styles.soundToggle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {playSoundOnFinish ? (
              <Volume2 size={22} color="#5eead4" />
            ) : (
              <VolumeX size={22} color="#5eead4" />
            )}
          </Pressable>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#5eead4" />
          </Pressable>
        </View>
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
  );

  // iOS uses the standard Modal
  if (Platform.OS === 'ios') {
    return (
      <Modal
        visible={visible}
        transparent={true}
        onRequestClose={onClose}
        animationType="none" // Keep animation none for iOS original behavior
      >
        <View style={styles.iosOverlay}> 
          <Pressable style={styles.backdrop} onPress={onClose} /> 
          {renderContent()} 
        </View>
      </Modal>
    );
  }

  // Android renders a View simulating a modal overlay
  if (!visible) {
    return null; // Don't render anything if not visible
  }

  return (
    <View style={styles.androidFakeModalWrapper}>
      {/* Backdrop for Android fake modal */}
      <Pressable style={styles.backdrop} onPress={onClose} />
      {/* Centering container for Android (aligned bottom) */}
      <View style={styles.androidCenteringContainer}>
         {renderContent()} 
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- iOS Specific Styles --- 
  iosOverlay: { // Overlay for iOS Modal
    flex: 1,
    justifyContent: 'flex-end', // Aligned bottom
    alignItems: 'center',
  },
  backdrop: { // Used by both, but context differs
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 26, 25, 0.5)', // Original backdrop color
  },

  // --- Android Specific Styles ---
  androidFakeModalWrapper: { // Covers the whole screen
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000, // High zIndex to be on top
  },
  androidCenteringContainer: { // Centers the modal content within the wrapper
    flex: 1,
    justifyContent: 'flex-end', // Aligned bottom
    alignItems: 'center',
  },

  // --- Common Styles --- 
  modalContainer: { // The visible modal box
    backgroundColor: '#115e59',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: 24,
    width: '100%', // Takes full width of its container
    // Removed positioning/sizing styles handled by parent
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
    paddingVertical: 12, 
  },
  title: {
    fontSize: 18, 
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  soundToggle: {
    padding: 4,
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
    height: 50,
    backgroundColor: '#0d3d56',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTimeOption: {
    backgroundColor: '#14b8a6',
  },
  timeText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#5eead4',
    textAlign: 'center',
  },
  selectedTimeText: {
    fontFamily: 'Inter-SemiBold',
    color: '#021a19',
    textAlign: 'center',
  },
});