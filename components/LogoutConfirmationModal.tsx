import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, // iOS only 
  Pressable, 
  Platform 
} from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

type Props = {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
};

export default function LogoutConfirmationModal({ 
  visible, 
  onConfirm, 
  onClose, 
  loading 
}: Props) {

  // Common content renderer
  const renderContent = () => (
    <Animated.View 
      style={styles.modalContainer}
      entering={SlideInDown.springify().damping(15)}
      exiting={SlideOutDown.springify().damping(15)}
    >
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Confirm Logout</Text>
          <Pressable 
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#5eead4" />
          </Pressable>
        </View>

        <Text style={styles.message}>
          Are you sure you want to log out? You'll need to sign in again to access your account.
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
            style={[styles.button, styles.logoutButton]} 
            onPress={onConfirm}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.logoutButtonText]}>
              {loading ? 'Logging out...' : 'Log out'}
            </Text>
          </Pressable>
        </View>
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
        animationType="fade"
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
      {/* Centering container for Android */}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: { // Used by both, but context differs
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 26, 25, 0.8)',
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
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- Common Styles --- 
  modalContainer: { // The visible modal box
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
  logoutButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  cancelButtonText: {
    color: '#5eead4',
  },
  logoutButtonText: {
    color: '#ffffff',
  },
});