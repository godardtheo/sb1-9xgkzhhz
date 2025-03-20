import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Platform, useWindowDimensions, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';

type Exercise = {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  instructions?: string;
  video_url?: string;
  type?: string;
  difficulty?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  exercise: Exercise | null;
};

export default function ExerciseDetailsModal({ visible, onClose, exercise }: Props) {
  const { width, height } = useWindowDimensions();
  const videoHeight = Math.min(width * 0.5625, height * 0.4); // 16:9 aspect ratio

  if (!exercise) return null;

  const instructions = exercise.instructions?.split('\n').filter(Boolean) || [];

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
          style={[styles.modalContainer, { width }]}
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.springify().damping(15)}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>{exercise.name}</Text>
              <Pressable 
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#5eead4" />
              </Pressable>
            </View>

            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.tags}>
                <View style={[styles.tag, styles.primaryTag]}>
                  <Text style={styles.primaryTagText}>{exercise.muscle}</Text>
                </View>
                {exercise.type && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{exercise.type}</Text>
                  </View>
                )}
                {exercise.difficulty && (
                  <View style={[styles.tag, styles.difficultyTag]}>
                    <Text style={styles.tagText}>{exercise.difficulty}</Text>
                  </View>
                )}
              </View>

              {exercise.video_url && (
                <View style={[styles.videoContainer, { height: videoHeight }]}>
                  <WebView
                    source={{ uri: exercise.video_url }}
                    style={styles.video}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowsFullscreenVideo={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#14b8a6" />
                      </View>
                    )}
                  />
                </View>
              )}

              {instructions.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Instructions</Text>
                  {instructions.map((instruction, index) => (
                    <View key={index} style={styles.instructionItem}>
                      <Text style={styles.instructionNumber}>{index + 1}</Text>
                      <Text style={styles.instructionText}>{instruction}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Equipment</Text>
                <View style={styles.equipmentTag}>
                  <Text style={styles.equipmentTagText}>{exercise.equipment}</Text>
                </View>
              </View>
            </ScrollView>
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
    backgroundColor: 'rgba(2, 26, 25, 0.8)',
  },
  modalContainer: {
    backgroundColor: '#031A19',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 -8px 20px -5px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 20,
      },
    }),
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#115e59',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  tag: {
    backgroundColor: '#115e59',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  primaryTag: {
    backgroundColor: '#0d9488',
  },
  difficultyTag: {
    backgroundColor: '#0f766e',
  },
  tagText: {
    color: '#ccfbf1',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  primaryTagText: {
    color: '#f0fdfa',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  videoContainer: {
    backgroundColor: '#0d3d56',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  video: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d3d56',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingRight: 16,
  },
  instructionNumber: {
    width: 24,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#14b8a6',
    textAlign: 'center',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ccfbf1',
    marginLeft: 12,
    lineHeight: 24,
  },
  equipmentTag: {
    backgroundColor: '#134e4a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  equipmentTagText: {
    color: '#5eead4',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});