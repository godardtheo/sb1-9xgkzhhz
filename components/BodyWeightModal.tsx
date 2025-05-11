import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
  KeyboardAvoidingView,
  ViewStyle,
  TextStyle
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import { logWeight } from '@/lib/weightUtils';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export enum BodyWeightModalMode {
  STARTING = 'starting',
  NEW = 'new',
  GOAL = 'goal'
}

interface BodyWeightModalProps {
  visible: boolean;
  mode: BodyWeightModalMode;
  onClose: () => void;
  onSuccess: () => void;
  initialValue?: number;
  weightUnit?: string; // e.g., 'kg' or 'lbs'
  customDate?: Date;
  initialNotes?: string;
  entryId?: string;
}

const BodyWeightModal: React.FC<BodyWeightModalProps> = ({
  visible,
  mode,
  onClose,
  onSuccess,
  initialValue,
  weightUnit = 'kg', // Default to kg if not provided
  customDate,
  initialNotes,
  entryId
}) => {
  const [weight, setWeight] = useState(initialValue ? initialValue.toString() : '');
  const [notes, setNotes] = useState(initialNotes || '');
  const [date, setDate] = useState(customDate || new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Animation
  const translateY = useSharedValue(300);

  // When the modal becomes visible, animate from bottom to top
  useEffect(() => {
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

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setWeight(initialValue ? initialValue.toString() : '');
      setNotes(initialNotes || '');
      setDate(customDate || new Date());
    }
  }, [visible, initialValue, initialNotes, customDate]);

  // Handle text input for weight that might contain commas
  const handleWeightChange = (text: string) => {
    // Replace commas with periods for decimal values
    const sanitizedText = text.replace(',', '.');
    setWeight(sanitizedText);
  };

  // Get modal title based on mode
  const getTitle = () => {
    switch (mode) {
      case BodyWeightModalMode.STARTING:
        return 'Starting weight';
      case BodyWeightModalMode.GOAL:
        return 'Weight goal';
      case BodyWeightModalMode.NEW:
      default:
        return 'Add weight';
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle date change
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate);
      // Always hide the picker after selection on all platforms
      setShowDatePicker(false);
    } else if (Platform.OS === 'ios') {
      // On iOS, we still want to hide the picker when the user cancels selection
      setShowDatePicker(false);
    }
  };

  // Handle form submission based on mode
  const handleSubmit = async () => {
    if (weight.trim() === '') {
      alert('Please enter a weight');
      return;
    }

    const weightValue = parseFloat(weight);

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('No authenticated user found. Please log in.');
        onClose();
        return;
      }

      switch (mode) {
        case BodyWeightModalMode.STARTING:
          // Save as initial weight in user_goals table
          console.log('[DEBUG] Saving initial weight to user_goals:', weightValue);
          const { error: initialError } = await supabase
            .from('user_goals') // Targets public.user_goals via default schema or production.user_goals if env is prod
            .upsert({ 
              user_id: user.id, 
              initial_weight: weightValue,
              updated_at: new Date().toISOString() // Keep updated_at fresh
            }, { 
              onConflict: 'user_id' 
            });

          if (initialError) {
            console.error('Error saving initial weight to user_goals:', initialError);
            alert('Error saving initial weight. Please try again.');
            return;
          }
          break;

        case BodyWeightModalMode.NEW:
          // If entryId exists, we're updating an existing entry
          if (entryId) {
            console.log('[DEBUG] Updating existing weight log using entryId:', entryId);
            
            // Use logWeight with entryId parameter to update the specific entry
            const success = await logWeight(weightValue, notes, date, entryId);
            
            if (!success) {
              console.error('Error updating weight log with entryId');
              alert('Error updating weight entry. Please try again.');
              return;
            }
            console.log('[DEBUG] Successfully updated weight log');
          } else {
            // Save as new weight log entry
            console.log('[DEBUG] Saving new weight log:', weightValue);
            const success = await logWeight(weightValue, notes, date);
            if (!success) {
              alert('Error saving weight. Please try again.');
              return;
            }
          }
          break;

        case BodyWeightModalMode.GOAL:
          // Save as goal weight in user_goals table
          console.log('[DEBUG] Saving goal weight:', weightValue);
          console.log('[DEBUG] Deadline date:', customDate);
          console.log('[DEBUG] User ID:', user.id);
          
          const { error: goalError } = await supabase
            .from('user_goals')
            .upsert({ 
              user_id: user.id, 
              weight: weightValue,
              deadline: customDate ? customDate.toISOString() : null,
              updated_at: new Date().toISOString()
            }, { 
              onConflict: 'user_id' 
            });

          if (goalError) {
            console.error('Error saving goal weight:', goalError);
            alert('Error saving goal weight. Please try again.');
            return;
          }
          break;
      }

      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidView}
        >
          <Animated.View
            style={[styles.modalContainer, animatedStyle]}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>{getTitle()}</Text>
              
              <Pressable
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#5eead4" />
              </Pressable>
            </View>
            
            <View style={styles.content}>
              {/* Weight and Date Input Row - In NEW mode, both on same line */}
              <View style={mode === BodyWeightModalMode.NEW ? styles.inputRow : {}}>
                {/* Weight Input */}
                <View style={[
                  styles.inputContainer, 
                  mode === BodyWeightModalMode.NEW ? [styles.inputHalf, styles.inputHalfLeft] : {}
                ]}>
                  <Text style={styles.inputLabel}>Weight ({weightUnit})</Text>
                  <TextInput
                    style={styles.input}
                    value={weight}
                    onChangeText={handleWeightChange}
                    placeholder={`Enter weight in ${weightUnit}`}
                    placeholderTextColor="#888888"
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
                
                {/* Date Input - Only for NEW mode */}
                {mode === BodyWeightModalMode.NEW && (
                  <View style={[styles.inputContainer, styles.inputHalf, styles.inputHalfRight]}>
                    <Text style={styles.inputLabel}>Date</Text>
                    
                    {Platform.OS === 'ios' ? (
                      <View style={styles.dateContainer}>
                        <DateTimePicker
                          value={date}
                          mode="date"
                          display="compact"
                          onChange={onDateChange}
                          maximumDate={new Date()}
                          style={styles.datePicker}
                          textColor="#ccfbf1"
                        />
                      </View>
                    ) : (
                      <>
                        <Pressable 
                          onPress={() => setShowDatePicker(true)}
                          style={styles.dateContainer}
                        >
                          <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
                        </Pressable>
                        
                        {showDatePicker && (
                          <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            maximumDate={new Date()}
                          />
                        )}
                      </>
                    )}
                  </View>
                )}
              </View>
              
              {/* Notes Input - Only for NEW mode */}
              {mode === BodyWeightModalMode.NEW && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.notesInput]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add notes about this weight entry"
                    placeholderTextColor="#888888"
                    multiline
                  />
                </View>
              )}
              
              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  } as ViewStyle,
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 26, 25, 0.5)',
  } as ViewStyle,
  keyboardAvoidView: {
    width: '100%',
  } as ViewStyle,
  modalContainer: {
    backgroundColor: '#115e59',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  } as ViewStyle,
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#5eead4',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  } as ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ccfbf1',
  } as TextStyle,
  closeButton: {
    padding: 4,
  } as ViewStyle,
  content: {
    padding: 16,
  } as ViewStyle,
  inputContainer: {
    marginBottom: 15,
  } as ViewStyle,
  inputLabel: {
    fontSize: 14,
    color: '#99f6e4',
    marginBottom: 5,
  } as TextStyle,
  input: {
    backgroundColor: '#0d3d56',
    color: '#ccfbf1',
    padding: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 8,
    fontSize: 16,
  } as TextStyle,
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
  } as TextStyle,
  dateContainer: {
    backgroundColor: '#0d3d56',
    borderRadius: 8,
    height: 40,
    justifyContent: 'flex-start',
    paddingHorizontal: Platform.OS === 'ios' ? 0 : 0,
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  datePicker: {
    height: 40,
    width: '100%',
  } as ViewStyle,
  dateButton: {
    backgroundColor: '#0d3d56',
    padding: Platform.OS === 'ios' ? 8 : 8,
    borderRadius: 8,
  } as ViewStyle,
  dateButtonText: {
    color: '#ccfbf1',
    fontSize: 16,
  } as TextStyle,
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  } as ViewStyle,
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  } as ViewStyle,
  cancelButton: {
    backgroundColor: '#134e4a',
    marginRight: 10,
  } as ViewStyle,
  saveButton: {
    backgroundColor: '#14b8a6',
  } as ViewStyle,
  cancelButtonText: {
    color: '#99f6e4',
  } as TextStyle,
  saveButtonText: {
    color: '#021a19',
    fontWeight: 'bold',
  } as TextStyle,
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  } as ViewStyle,
  inputHalf: {
    flex: 1,
    width: '48%',
  } as ViewStyle,
  inputHalfLeft: {
    marginRight: 8,
  } as ViewStyle,
  inputHalfRight: {
    marginLeft: 8,
  } as ViewStyle,
});

export default BodyWeightModal; 