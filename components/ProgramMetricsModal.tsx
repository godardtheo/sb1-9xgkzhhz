import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, // iOS only 
  Pressable, 
  ScrollView, 
  Platform 
} from 'react-native';
import { X, Dumbbell, Timer, ChartBar as BarChart3 } from 'lucide-react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';

type Props = {
  visible: boolean;
  onClose: () => void;
  metrics: {
    workouts: number;
    sets: number;
    duration: string;
  };
};

export default function ProgramMetricsModal({ visible, onClose, metrics }: Props) {

  // Common content renderer
  const renderContent = () => (
    <Animated.View 
      style={styles.modalContainer}
      entering={SlideInDown.springify().damping(15)}
      exiting={SlideOutDown.springify().damping(15)}
    >
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Program Metrics</Text>
          <Pressable 
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#5eead4" />
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, styles.workoutsIcon]}>
                <Dumbbell size={24} color="#042f2e" />
              </View>
              <Text style={styles.metricValue}>{metrics.workouts}</Text>
              <Text style={styles.metricLabel}>Workouts</Text>
              <Text style={styles.metricDescription}>
                Total number of workouts in this program
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, styles.setsIcon]}>
                <BarChart3 size={24} color="#042f2e" />
              </View>
              <Text style={styles.metricValue}>{metrics.sets}</Text>
              <Text style={styles.metricLabel}>Total Sets</Text>
              <Text style={styles.metricDescription}>
                Combined number of sets across all workouts
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, styles.durationIcon]}>
                <Timer size={24} color="#042f2e" />
              </View>
              <Text style={styles.metricValue}>{metrics.duration}</Text>
              <Text style={styles.metricLabel}>Duration</Text>
              <Text style={styles.metricDescription}>
                Estimated total duration of the program
              </Text>
            </View>
          </View>

          <View style={styles.guidelines}>
            <Text style={styles.guidelinesTitle}>Program Guidelines</Text>
            <View style={styles.guidelineItem}>
              <Text style={styles.guidelineLabel}>Rest Between Workouts</Text>
              <Text style={styles.guidelineValue}>24-48 hours</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Text style={styles.guidelineLabel}>Weekly Frequency</Text>
              <Text style={styles.guidelineValue}>3-5 sessions</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Text style={styles.guidelineLabel}>Program Duration</Text>
              <Text style={styles.guidelineValue}>4-8 weeks</Text>
            </View>
            <Text style={styles.guidelineNote}>
              Note: These are general guidelines. Adjust based on your fitness level and goals.
            </Text>
          </View>
        </ScrollView>
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
    // ProgramMetrics is aligned to bottom, not centered
    justifyContent: 'flex-end', 
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
    // ProgramMetrics is aligned to bottom, not centered
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  // --- Common Styles --- 
  modalContainer: { // The visible modal box
    backgroundColor: '#031A19',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%', // Fixed height
    width: '100%', // Full width
    overflow: 'hidden',
    // Remove positioning styles handled by overlay/wrapper
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#115e59',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  metricsGrid: {
    padding: 16,
    gap: 16,
  },
  metricCard: {
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutsIcon: {
    backgroundColor: '#14b8a6',
  },
  setsIcon: {
    backgroundColor: '#0d9488',
  },
  durationIcon: {
    backgroundColor: '#0f766e',
  },
  metricValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    marginBottom: 8,
  },
  metricDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    textAlign: 'center',
    opacity: 0.8,
  },
  guidelines: {
    padding: 16,
    backgroundColor: '#0d3d56',
    margin: 16,
    borderRadius: 16,
  },
  guidelinesTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 16,
  },
  guidelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#115e59',
  },
  guidelineLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  guidelineValue: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ccfbf1',
  },
  guidelineNote: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    marginTop: 16,
    fontStyle: 'italic',
    opacity: 0.8,
  },
});