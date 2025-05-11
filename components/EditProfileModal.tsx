import { View, Text, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, Platform, Image, ViewStyle, TextStyle, ImageStyle, TouchableWithoutFeedback, Keyboard, StyleProp } from 'react-native';
import { X, Camera, Upload, ChevronDown } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Animated, { FadeIn, SlideInDown, SlideOutDown, Layout } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

type Props = {
  visible: boolean;
  onClose: () => void;
  userData: {
    full_name: string;
    username: string;
    avatar_url: string | null;
    height: number | null;
    gender: string | null;
  };
  onUpdate: () => void;
};

const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const;
type Gender = typeof GENDER_OPTIONS[number];

export default function EditProfileModal({ visible, onClose, userData, onUpdate }: Props) {
  const [fullName, setFullName] = useState(userData.full_name || '');
  const [username, setUsername] = useState(userData.username || '');
  const [height, setHeight] = useState(userData.height?.toString() || '');
  const [gender, setGender] = useState<Gender | ''>(userData.gender as Gender || '');
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal becomes visible with new userData
  useEffect(() => {
    if (visible) {
      setFullName(userData.full_name || '');
      setUsername(userData.username || '');
      setHeight(userData.height?.toString() || '');
      setGender(userData.gender as Gender || '');
      setError(null);
      setSuccess(false);
    }
  }, [visible, userData]);

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates = {
        id: user.id,
        full_name: fullName,
        username,
        height: height ? parseFloat(height) : null,
        gender: gender || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .schema('public')
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      onUpdate();
      
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View 
          style={styles.modalContainer as ViewStyle}
          entering={Platform.OS === 'android' ? undefined : SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.springify().damping(15)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.modalContent as ViewStyle}>
              <View style={styles.header as ViewStyle}>
                <Text style={styles.title as TextStyle}>Edit Profile</Text>
                <Pressable 
                  onPress={onClose}
                  style={styles.closeButton as ViewStyle}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={24} color="#5eead4" />
                </Pressable>
              </View>

              <View style={styles.form as ViewStyle}>
                <View style={styles.inputGroup as ViewStyle}>
                  <Text style={styles.label as TextStyle}>Full Name</Text>
                  <TextInput
                    style={[styles.input, Platform.OS === 'web' && styles.inputWeb].filter(Boolean) as StyleProp<TextStyle>}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your full name"
                    placeholderTextColor="#5eead4"
                  />
                </View>

                <View style={styles.inputGroup as ViewStyle}>
                  <Text style={styles.label as TextStyle}>Username</Text>
                  <TextInput
                    style={[styles.input, Platform.OS === 'web' && styles.inputWeb].filter(Boolean) as StyleProp<TextStyle>}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Choose a username"
                    placeholderTextColor="#5eead4"
                  />
                </View>

                <View style={styles.rowInputs as ViewStyle}>
                  <View style={[styles.inputGroup, styles.flexHalf].filter(Boolean) as StyleProp<ViewStyle>}>
                    <Text style={styles.label as TextStyle}>Height (cm)</Text>
                    <TextInput
                      style={[styles.input, Platform.OS === 'web' && styles.inputWeb].filter(Boolean) as StyleProp<TextStyle>}
                      value={height}
                      onChangeText={(value) => {
                        const filtered = value.replace(/[^0-9.]/g, '');
                        const parts = filtered.split('.');
                        if (parts.length > 2) return;
                        setHeight(filtered);
                      }}
                      placeholder="Enter height"
                      placeholderTextColor="#5eead4"
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.flexHalf].filter(Boolean) as StyleProp<ViewStyle>}>
                    <Text style={styles.label as TextStyle}>Gender</Text>
                    <View style={styles.dropdownContainer as ViewStyle}>
                      <Pressable
                        style={[styles.input, styles.selectInput].filter(Boolean) as StyleProp<ViewStyle>}
                        onPress={() => setShowGenderDropdown(!showGenderDropdown)}
                      >
                        <Text style={[styles.selectText, !gender && styles.placeholderText].filter(Boolean) as StyleProp<TextStyle>}>
                          {gender || 'Gender'}
                        </Text>
                        <ChevronDown size={20} color="#5eead4" />
                      </Pressable>
                      
                      {showGenderDropdown && (
                        <Animated.View 
                          style={[styles.dropdown].filter(Boolean) as StyleProp<ViewStyle>}
                          entering={Platform.OS === 'android' ? undefined : FadeIn.duration(200)}
                          layout={Layout.springify()}
                        >
                          {GENDER_OPTIONS.map((option) => (
                            <Pressable
                              key={option}
                              style={[
                                styles.dropdownItem,
                                gender === option && styles.dropdownItemSelected
                              ].filter(Boolean) as StyleProp<ViewStyle>}
                              onPress={() => {
                                setGender(option);
                                setShowGenderDropdown(false);
                              }}
                            >
                              <Text style={[
                                styles.dropdownText,
                                gender === option && styles.dropdownTextSelected
                              ].filter(Boolean) as StyleProp<TextStyle>}>
                                {option}
                              </Text>
                            </Pressable>
                          ))}
                        </Animated.View>
                      )}
                    </View>
                  </View>
                </View>

                {error && (
                  <Text style={styles.errorText as TextStyle}>{error}</Text>
                )}

                {success && (
                  <Animated.View 
                    style={styles.successMessage as ViewStyle}
                    entering={FadeIn.duration(200)}
                  >
                    <Text style={styles.successText as TextStyle}>Profile updated successfully!</Text>
                  </Animated.View>
                )}

                <Pressable 
                  style={[styles.saveButton, loading && styles.saveButtonDisabled].filter(Boolean) as StyleProp<ViewStyle>}
                  onPress={handleUpdateProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#021a19" />
                  ) : (
                    <Text style={styles.saveButtonText as TextStyle}>Save Changes</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
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
    maxHeight: '90%',
  },
  modalContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    gap: 20,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 16,
  },
  flexHalf: {
    flex: 1,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  input: {
    backgroundColor: '#0d3d56',
    borderRadius: 12,
    padding: 12,
    color: '#ccfbf1',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  inputWeb: {
    // outlineStyle: 'none', // Removed: Not valid in React Native
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    color: '#ccfbf1',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  placeholderText: {
    color: '#5eead4',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 9999,
  },
  dropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#0d3d56',
    borderRadius: 12,
    marginBottom: 4,
    padding: 4,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 4px rgba(0,0,0,0.25)',
      },
    }),
  },
  dropdownItem: {
    padding: 12,
    borderRadius: 8,
  },
  dropdownItemSelected: {
    backgroundColor: '#14b8a6',
  },
  dropdownText: {
    color: '#ccfbf1',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  dropdownTextSelected: {
    color: '#042f2e',
    fontFamily: 'Inter-Medium',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  successMessage: {
    backgroundColor: '#059669',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  successText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  saveButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#021a19',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});