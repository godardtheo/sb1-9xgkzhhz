import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Platform, AppState, AppStateStatus, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getWeightHistory, logWeight } from '@/lib/weightUtils';
import { supabase } from '@/lib/supabase';
import WeightProgressionChartCard from '@/components/WeightProgressionChartCard';
import RecentEntriesCard from '@/components/RecentEntriesCard';
import BodyWeightModal, { BodyWeightModalMode } from '@/components/BodyWeightModal';

interface WeightData {
  date: string;
  weight: number;
  notes?: string;
  id?: string;
}

// Add interface for datum prop
interface WeightDatum {
  date: string;
  weight: number;
  notes?: string;
  id?: string;
}

export default function BodyWeightPage() {
  const router = useRouter();
  const [appStateStatus, setAppStateStatus] = useState<AppStateStatus>(AppState.currentState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [weightData, setWeightData] = useState<WeightData[]>([]);
  const [weightGoal, setWeightGoal] = useState<number | null>(null);
  const [initialWeight, setInitialWeight] = useState<number | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WeightData | null>(null);
  
  // Add state for the BodyWeightModal component
  const [bodyWeightModalVisible, setBodyWeightModalVisible] = useState(false);
  const [bodyWeightModalMode, setBodyWeightModalMode] = useState<BodyWeightModalMode>(BodyWeightModalMode.NEW);
  const [initialModalValue, setInitialModalValue] = useState<number | null>(null);

  // Set up AppState listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppStateStatus(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Fetch weight data
  const fetchWeightData = async () => {
    try {
      setIsLoading(true);
      // Fetch all weight history instead of just 30 days
      const history = await getWeightHistory();
      
      if (history && history.length > 0) {
        console.log(`Loaded ${history.length} weight entries`);
        // Format the data for use in charts
        const formattedData = history.map(entry => ({
          date: entry.date,
          weight: entry.weight,
          notes: entry.notes || '',
          id: entry.id
        }));
        
        setWeightData(formattedData);
      } else {
        console.log('No weight data found');
        setWeightData([]);
      }
      
      // Fetch user data
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get initial weight from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('initial_weight')
          .eq('id', user.id)
          .single();
        
        if (!userError && userData) {
          setInitialWeight(userData.initial_weight);
          console.log('[DEBUG] Fetched initial weight:', userData.initial_weight);
        }
        
        // Get goal weight from user_goals table
        const { data: goalData, error: goalError } = await supabase
          .from('user_goals')
          .select('weight')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        if (!goalError && goalData) {
          setWeightGoal(goalData.weight);
          console.log('[DEBUG] Fetched goal weight:', goalData.weight);
        }
      }
    } catch (err) {
      console.error('Error fetching weight data:', err);
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle when a data point is pressed
  const handlePointPress = (entry: WeightData) => {
    setSelectedEntry(entry);
    // Instead of opening the details modal, open the BodyWeightModal in NEW mode with existing data
    setBodyWeightModalMode(BodyWeightModalMode.NEW);
    setInitialModalValue(entry.weight);
    
    // Convert the date string to a Date object for the modal
    const entryDate = new Date(entry.date);
    
    // Need to customize the BodyWeightModal with the existing entry's data
    setBodyWeightModalVisible(true);
    
    // Only use haptics on native platforms (iOS, Android)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Initial load and reload when app state changes
  useEffect(() => {
    fetchWeightData();
  }, [appStateStatus]);

  // Handler for opening modal in STARTING mode
  const handleStartingPress = () => {
    if (initialWeight) {
      setBodyWeightModalMode(BodyWeightModalMode.STARTING);
      setInitialModalValue(initialWeight);
      setBodyWeightModalVisible(true);
      // Only use haptics on native platforms (iOS, Android)
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  // Handler for opening modal in NEW mode
  const handleCurrentPress = () => {
    if (weightData.length > 0) {
      setBodyWeightModalMode(BodyWeightModalMode.NEW);
      setInitialModalValue(weightData[weightData.length - 1].weight);
      setBodyWeightModalVisible(true);
      // Only use haptics on native platforms (iOS, Android)
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  // Handler for opening modal in GOAL mode
  const handleGoalPress = () => {
    setBodyWeightModalMode(BodyWeightModalMode.GOAL);
    setInitialModalValue(weightGoal);
    setBodyWeightModalVisible(true);
    // Only use haptics on native platforms (iOS, Android)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Handler for modal success
  const handleModalSuccess = () => {
    fetchWeightData();
  };

  // If there's an error, show an error message
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Link href="../" asChild>
            <TouchableOpacity style={styles.backButton}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </Link>
          <Text style={styles.title}>Body Weight</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchWeightData}>
            <Ionicons name="refresh" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.errorText}>Error loading weight data: {error.message}</Text>
          <TouchableOpacity style={styles.button} onPress={fetchWeightData}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Link href="../" asChild>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </Link>
        <Text style={styles.title}>Body Weight</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={() => {
            setBodyWeightModalMode(BodyWeightModalMode.NEW);
            setInitialModalValue(null);
            setBodyWeightModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Weight Chart */}
        <WeightProgressionChartCard
          isLoading={isLoading}
          weightData={weightData}
          weightGoal={weightGoal}
          initialWeight={initialWeight}
          onStartingPress={handleStartingPress}
          onCurrentPress={handleCurrentPress}
          onGoalPress={handleGoalPress}
        />
        
        {/* Recent Entries */}
        <RecentEntriesCard
          isLoading={isLoading}
          weightData={weightData}
          onEntryPress={handlePointPress}
        />
      </ScrollView>
      
      {/* Entry Details Modal */}
      <Modal
        visible={detailsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { width: '90%', maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Weight Entry Detail</Text>
              <TouchableOpacity 
                onPress={() => setDetailsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#5eead4" />
              </TouchableOpacity>
            </View>
            
            {selectedEntry && (
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedEntry.date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Weight:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.weight.toFixed(1)} kg</Text>
                </View>
                
                {selectedEntry.notes ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Notes:</Text>
                    <Text style={styles.detailValue}>{selectedEntry.notes}</Text>
                  </View>
                ) : null}

                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      // Allow time for the modal to close
                      setTimeout(() => {
                        setBodyWeightModalMode(BodyWeightModalMode.NEW);
                        setInitialModalValue(selectedEntry.weight);
                        setBodyWeightModalVisible(true);
                      }, 300);
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#f0fdfa" />
                    <Text style={styles.actionButtonText}>Edit Entry</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => {
                      Alert.alert(
                        'Delete Weight Entry',
                        'Are you sure you want to delete this weight entry? This action cannot be undone.',
                        [
                          {
                            text: 'Cancel',
                            style: 'cancel'
                          },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              if (selectedEntry && selectedEntry.id) {
                                const { error } = await supabase
                                  .from('weight_logs')
                                  .delete()
                                  .eq('id', selectedEntry.id);
                                
                                if (error) {
                                  console.error('Error deleting weight entry:', error);
                                  Alert.alert('Error', 'Failed to delete weight entry');
                                } else {
                                  // Only use haptics on native platforms
                                  if (Platform.OS !== 'web') {
                                    Haptics.notificationAsync(
                                      Haptics.NotificationFeedbackType.Success
                                    );
                                  }
                                  setDetailsModalVisible(false);
                                  fetchWeightData();
                                }
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#f0fdfa" />
                    <Text style={styles.actionButtonText}>Delete Entry</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add BodyWeightModal Component */}
      <BodyWeightModal
        visible={bodyWeightModalVisible}
        mode={bodyWeightModalMode}
        onClose={() => {
          setBodyWeightModalVisible(false);
          // Reset selectedEntry if we were editing an existing entry
          if (bodyWeightModalMode === BodyWeightModalMode.NEW && selectedEntry) {
            setSelectedEntry(null);
          }
        }}
        onSuccess={handleModalSuccess}
        initialValue={initialModalValue || undefined}
        weightUnit="kg"
        customDate={selectedEntry && bodyWeightModalMode === BodyWeightModalMode.NEW ? new Date(selectedEntry.date) : undefined}
        initialNotes={selectedEntry?.notes}
        entryId={selectedEntry?.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 24,
    paddingBottom: 8,
    backgroundColor: '#042f2e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(94, 234, 212, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorText: {
    color: '#f87171',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0f766e',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ccfbf1',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#0d9488',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 20,
  },
  addButtonText: {
    color: '#f0fdfa',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#042f2e',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5eead4',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#99f6e4',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#115e59',
    color: '#ccfbf1',
    padding: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 8,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#134e4a',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#0d9488',
  },
  cancelButtonText: {
    color: '#99f6e4',
  },
  saveButtonText: {
    color: '#f0fdfa',
    fontWeight: 'bold',
  },
  detailItem: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 14,
    color: '#99f6e4',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 16,
    color: '#ccfbf1',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  editButton: {
    backgroundColor: '#0d9488',
  },
  deleteButton: {
    backgroundColor: '#b91c1c',
  },
  actionButtonText: {
    color: '#f0fdfa',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  }
}); 