import { View, Text, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, Platform, Image } from 'react-native';
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userData.avatar_url);
  const [uploading, setUploading] = useState(false);

  // Reset state when modal becomes visible with new userData
  useEffect(() => {
    if (visible) {
      setFullName(userData.full_name || '');
      setUsername(userData.username || '');
      setHeight(userData.height?.toString() || '');
      setGender(userData.gender as Gender || '');
      setAvatarUrl(userData.avatar_url);
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
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
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

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        setError(null);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Create a unique file path for the avatar
        const fileExt = result.assets[0].uri.split('.').pop();
        const filePath = `${user.id}-${Date.now()}.${fileExt}`;

        // For React Native, we need to read the file as base64
        const fileBase64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { 
          encoding: FileSystem.EncodingType.Base64 
        });

        // Upload the file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(fileBase64), {
            contentType: `image/${fileExt}`,
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update state with the new avatar URL
        setAvatarUrl(publicUrl);
      }
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Helper function to decode base64
  function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

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
              <Text style={styles.title}>Edit Profile</Text>
              <Pressable 
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#5eead4" />
              </Pressable>
            </View>

            <View style={styles.form}>
              <Pressable style={styles.avatarButton} onPress={handlePickImage}>
                <View style={styles.avatarContainer}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <Camera size={32} color="#5eead4" />
                  )}
                </View>
                <View style={styles.uploadButton}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#021a19" />
                  ) : (
                    <Upload size={16} color="#021a19" />
                  )}
                </View>
              </Pressable>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && styles.inputWeb]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#5eead4"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && styles.inputWeb]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Choose a username"
                  placeholderTextColor="#5eead4"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, styles.flexHalf]}>
                  <Text style={styles.label}>Height (cm)</Text>
                  <TextInput
                    style={[styles.input, Platform.OS === 'web' && styles.inputWeb]}
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

                <View style={[styles.inputGroup, styles.flexHalf]}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.dropdownContainer}>
                    <Pressable
                      style={[styles.input, styles.selectInput]}
                      onPress={() => setShowGenderDropdown(!showGenderDropdown)}
                    >
                      <Text style={[styles.selectText, !gender && styles.placeholderText]}>
                        {gender || 'Gender'}
                      </Text>
                      <ChevronDown size={20} color="#5eead4" />
                    </Pressable>
                    
                    {showGenderDropdown && (
                      <Animated.View 
                        style={[styles.dropdown]}
                        entering={FadeIn.duration(200)}
                        layout={Layout.springify()}
                      >
                        {GENDER_OPTIONS.map((option) => (
                          <Pressable
                            key={option}
                            style={[
                              styles.dropdownItem,
                              gender === option && styles.dropdownItemSelected
                            ]}
                            onPress={() => {
                              setGender(option);
                              setShowGenderDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownText,
                              gender === option && styles.dropdownTextSelected
                            ]}>
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
                <Text style={styles.errorText}>{error}</Text>
              )}

              {success && (
                <Animated.View 
                  style={styles.successMessage}
                  entering={FadeIn.duration(200)}
                >
                  <Text style={styles.successText}>Profile updated successfully!</Text>
                </Animated.View>
              )}

              <Pressable 
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#021a19" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
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
  avatarButton: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0d3d56',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#14b8a6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#115e59',
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
    outlineStyle: 'none',
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