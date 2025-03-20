import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';

type Props = {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  workoutName: string;
};

export default function DeleteWorkoutConfirmation({ visible, onConfirm, onClose, loading, workoutName }: Props) {
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
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.springify().damping(15)}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Remove Workout</Text>
              <Pressable 
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#5eead4" />
              </Pressable>
            </View>

            <Text style={styles.message}>
              Are you sure you want to remove "{workoutName}" from this program? This action cannot be undone.
            </Text>

            <View style={styles.actions}>
              <Pressable 
                style={[styles.button, styles.cancelButton]} 
                onPress={onClose}
                disabled={loading}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.button, styles.deleteButton]} 
                onPress={onConfirm}
                disabled={loading}
              >
                <Text style={[styles.buttonText, styles.deleteButtonText]}>
                  {loading ? 'Removing...' : 'Remove'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 26, 25, 0.8)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#115e59',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  closeButton: {
    padding: 4,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    lineHeight: 24,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#0d3d56',
  },
  deleteButton: {
    backgroundColor: '#450a0a',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  cancelButtonText: {
    color: '#5eead4',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
});