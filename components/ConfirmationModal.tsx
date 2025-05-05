import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  confirmColor?: string;
  loading?: boolean;
};

export default function ConfirmationModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  confirmColor = '#14b8a6',
  loading = false,
}: Props) {

  const renderContent = () => (
    <Animated.View
      style={styles.modalContainer} 
      entering={SlideInDown.springify().damping(15)}
      exiting={SlideOutDown.springify().damping(15)}
    >
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#5eead4" />
          </Pressable>
        </View>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>{cancelText}</Text>
          </Pressable>
          <Pressable
            style={[
              styles.button,
              styles.confirmButton,
              { backgroundColor: confirmColor },
            ]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={[
                  styles.confirmButtonText,
                  {
                    color: confirmColor === '#ef4444' ? '#fff' : '#021a19',
                  },
                ]}
              >
                {confirmText}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );

  if (Platform.OS === 'ios') {
    return (
      <Modal
        visible={visible}
        transparent={true}
        onRequestClose={onClose}
        animationType="fade"
      >
        <View style={styles.iosOverlay}> 
          <Pressable style={styles.backdrop} onPress={onClose} /> 
          {renderContent()}
        </View>
      </Modal>
    );
  }

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.androidFakeModalWrapper}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.androidCenteringContainer}>
         {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iosOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 26, 25, 0.8)',
  },
  androidFakeModalWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  androidCenteringContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#115e59',
    borderRadius: 24,
    overflow: 'hidden',
    width: '90%',
    maxWidth: 400,
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
  confirmButton: {
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#5eead4',
  },
  confirmButtonText: {
  },
});
