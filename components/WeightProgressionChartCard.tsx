import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, LayoutChangeEvent, Platform, Modal } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

interface WeightData {
  date: string;
  weight: number;
  notes?: string;
}

interface WeightProgressionChartCardProps {
  isLoading: boolean;
  weightData: WeightData[];
  weightGoal: number | null;
  initialWeight: number | null;
  onStartingPress?: () => void;
  onCurrentPress?: () => void;
  onGoalPress?: () => void;
}

const WeightProgressionChartCard: React.FC<WeightProgressionChartCardProps> = ({ 
  isLoading, 
  weightData, 
  weightGoal,
  initialWeight,
  onStartingPress,
  onCurrentPress, 
  onGoalPress
}) => {
  // Get initial width from Dimensions as fallback
  const screenWidth = Dimensions.get('window').width;
  const initialWidth = Platform.OS === 'web' ? screenWidth - 40 : 0; // Fallback for web
  const [containerWidth, setContainerWidth] = useState(initialWidth);
  // Add state for number of entries to display
  const [displayEntries, setDisplayEntries] = useState(7);
  // State for dropdown visibility
  const [dropdownVisible, setDropdownVisible] = useState(false);
  // Add state for tooltip
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipIndex, setTooltipIndex] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Handle layout measurement
  const onContainerLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  // Use effect to ensure we have a width on web
  useEffect(() => {
    if (Platform.OS === 'web' && containerWidth === 0) {
      // Force a reasonable fallback width for web
      setContainerWidth(screenWidth - 40);
    }
  }, []);

  // Calculate chart width
  const chartWidth = containerWidth > 0 ? containerWidth + 32 : screenWidth - 40;
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Limit X-axis labels to maximum 5 values
  const limitXAxisLabels = (allLabels: string[], weights: number[]) => {
    if (allLabels.length <= 5) return allLabels;
    
    // Create array of empty strings with same length as data points
    const result = Array(allLabels.length).fill('');
    
    // Always show first and last labels
    result[0] = allLabels[0];
    result[allLabels.length - 1] = allLabels[allLabels.length - 1];
    
    // Adjust number of points to show based on total entries
    let numPointsToShow = 3; // Default for 15+ entries
    
    if (displayEntries <= 7) {
      // For 7 entries: show only 2 points in between
      numPointsToShow = 2;
    } else if (displayEntries <= 15) {
      // For 15 entries: show 3 points in between
      numPointsToShow = 3;
    }
    // For 30 entries: leave as default (3 points)
    
    // Calculate even spacing
    const step = Math.ceil((allLabels.length - 2) / (numPointsToShow + 1));
    
    for (let i = 1; i <= numPointsToShow; i++) {
      const index = Math.min(Math.round(i * step), allLabels.length - 2);
      result[index] = allLabels[index];
    }
    
    return result;
  };
  
  // Process the current dataset once and memoize it
  const processedData = useMemo(() => {
    // Use selected number of entries
    const dataToDisplay = weightData.slice(-displayEntries);
    
    const allLabels = dataToDisplay.map(entry => formatDate(entry.date));
    const weights = dataToDisplay.map(entry => entry.weight);
    
    // Generate labels array of same length as data with empty strings for positions we don't want to show
    const limitedLabels = limitXAxisLabels(allLabels, weights);
    
    // Add two empty labels on each side for better padding
    const paddedLabels = ['', '', ...limitedLabels, '', ''];
    
    // Now use two padding points on each side
    const paddedData = 
      weights.length > 0 
        ? [weights[0], weights[0], ...weights, weights[weights.length - 1], weights[weights.length - 1]]
        : [];
    
    return { 
      paddedLabels, 
      paddedData, 
      allWeights: weights,
      originalData: dataToDisplay // Keep the original data for the tooltip
    };
  }, [weightData, displayEntries]);

  // Calculate weight progress statistics
  const getWeightProgress = () => {
    if (!initialWeight || weightData.length === 0) return { change: 0, percentage: 0 };
    
    const currentWeight = weightData[weightData.length - 1].weight;
    const change = currentWeight - initialWeight;
    const percentage = (change / initialWeight) * 100;
    
    return { change, percentage };
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (!weightData || weightData.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }]
      };
    }
    
    const { paddedLabels, paddedData } = processedData;
    
    return {
      labels: paddedLabels,
      datasets: [{ 
        data: paddedData
      }]
    };
  };

  // Entry selector dropdown
  const renderEntrySelectorDropdown = () => {
    const options = [7, 15, 30];
    
    return (
      <View>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => setDropdownVisible(true)}
        >
          <Text style={styles.dropdownButtonText}>Last {displayEntries} entries</Text>
          <Ionicons name="chevron-down" size={16} color="#99f6e4" />
        </TouchableOpacity>
        
        <Modal
          transparent={true}
          visible={dropdownVisible}
          animationType="fade"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => setDropdownVisible(false)}
          >
            <View style={styles.dropdownMenu}>
              {options.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.dropdownItem,
                    displayEntries === option && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    setDisplayEntries(option);
                    setDropdownVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.dropdownItemText,
                      displayEntries === option && styles.dropdownItemTextSelected
                    ]}
                  >
                    Last {option} entries
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.loadingText}>Loading chart data...</Text>
      </View>
    );
  }

  if (weightData.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.noDataText}>No weight data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer} onLayout={onContainerLayout}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Weight Progression</Text>
        {renderEntrySelectorDropdown()}
      </View>

      <View style={styles.chartWrapper}>
        <View style={{marginLeft: -10, marginRight: -46}}>
          <LineChart
            data={prepareChartData()}
            width={chartWidth}
            height={220}
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: '#042f2e',
              backgroundGradientFrom: '#042f2e',
              backgroundGradientTo: '#042f2e',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(94, 234, 212, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(204, 251, 241, ${opacity})`,
              style: {
                borderRadius: 12
              },
              propsForDots: {
                r: "3",
                strokeWidth: "0.5",
                stroke: "#14b8a6"
              },
              strokeWidth: 1.5,
              propsForLabels: {
                fontSize: 10
              },
              // Keep the rotation at 0 degrees for readability
              horizontalLabelRotation: 0
            }}
            withInnerLines={true}
            withOuterLines={true}
            fromZero={false}
            bezier
            // Use a function to dynamically get min/max values for the chart with added padding
            getDotProps={(dataPoint, index) => {
              // Hide dots for the padding entries (first two and last two)
              return index === 0 || index === 1 || 
                     index === processedData.paddedData.length - 1 ||
                     index === processedData.paddedData.length - 2
                ? { r: "0", strokeWidth: "0" } // Invisible dots for padding entries
                : { r: "3", strokeWidth: "0.5", stroke: "#14b8a6" } // Normal dots for data
            }}
            segments={4}
            // Set specific Y-axis properties
            yAxisInterval={1} // Show label at each tick
            yLabelsOffset={-28} // Negative offset brings labels closer to the axis
            // Format Y-axis labels to show only integers
            formatYLabel={(yValue) => parseFloat(yValue).toFixed(1)}
            style={{
              ...styles.chart,
              marginHorizontal: -16, // Neutralize the container's padding
              paddingRight: 0, // Remove right padding
              paddingLeft: 0 // Ensure no left padding
            }}
            // Add tooltip decorator
            decorator={() => {
              if (!tooltipVisible || !processedData.originalData) return null;
              
              // Account for the padding points (skip first two indices)
              const dataIndex = tooltipIndex - 2;
              
              // Only show tooltip for actual data points (not padding)
              if (dataIndex < 0 || dataIndex >= processedData.originalData.length) return null;
              
              const selectedData = processedData.originalData[dataIndex];
              const date = new Date(selectedData.date);
              // Format as dd/mm
              const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
              
              return (
                <View style={{
                  position: 'absolute',
                  left: tooltipPosition.x - 50,
                  top: tooltipPosition.y - 42,
                  alignItems: 'center',
                }}>
                  {/* Tooltip container */}
                  <View style={{
                    backgroundColor: '#0f766e',
                    borderRadius: 8,
                    padding: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 100,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                  }}>
                    <Text style={{ 
                      color: '#ccfbf1', 
                      fontSize: 12
                    }}>
                      {formattedDate}: 
                    </Text>
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'baseline', // Align items to text baseline
                    }}>
                      <Text style={{ 
                        color: '#5eead4', 
                        fontWeight: 'bold',
                        fontSize: 14,
                      }}>
                        {selectedData.weight.toFixed(1)}
                      </Text>
                      <Text style={{
                        color: '#5eead4',
                        fontWeight: 'normal',
                        fontSize: 10,
                        marginLeft: 1
                      }}>
                        kg
                      </Text>
                    </View>
                  </View>
                  
                  {/* Arrow pointing down */}
                  <View style={{
                    width: 0,
                    height: 0,
                    backgroundColor: 'transparent',
                    borderStyle: 'solid',
                    borderLeftWidth: 8,
                    borderRightWidth: 8,
                    borderTopWidth: 8,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: '#0f766e',
                    marginTop: -1, // Slight overlap with tooltip
                  }} />
                </View>
              );
            }}
            // Handle touch events for tooltip
            onDataPointClick={({ dataset, index, x, y }) => {
              // Skip tooltip for padding points
              if (index < 2 || index >= processedData.paddedData.length - 2) return;
              
              // Toggle tooltip visibility - if already showing same point, hide it
              if (tooltipVisible && tooltipIndex === index) {
                setTooltipVisible(false);
              } else {
                setTooltipVisible(true);
                setTooltipIndex(index);
                setTooltipPosition({ x, y });
              }
            }}
          />
          
          {/* Add a transparent overlay to handle touches outside the chart to dismiss tooltip */}
          {tooltipVisible && (
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setTooltipVisible(false)}
              activeOpacity={0}
            />
          )}
        </View>
      </View>
      
      {/* Weight Statistics */}
      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={styles.statItem} 
          onPress={onStartingPress}
          disabled={!onStartingPress}
        >
          <Text style={styles.statLabel}>Starting</Text>
          <Text style={[
            styles.statValue,
            onStartingPress ? styles.clickableText : null
          ]}>
            {initialWeight ? `${initialWeight.toFixed(1)} kg` : '-'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.statItem} 
          onPress={onCurrentPress}
          disabled={!onCurrentPress}
        >
          <Text style={styles.statLabel}>Current</Text>
          <Text style={[
            styles.statValue,
            onCurrentPress ? styles.clickableText : null
          ]}>
            {weightData.length > 0 ? `${weightData[weightData.length - 1].weight.toFixed(1)} kg` : '-'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.statItem} 
          onPress={onGoalPress}
          disabled={!onGoalPress}
        >
          <Text style={styles.statLabel}>Goal</Text>
          <Text style={[
            styles.statValue,
            onGoalPress ? styles.clickableText : null
          ]}>
            {weightGoal ? `${weightGoal.toFixed(1)} kg` : '-'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Summary */}
      {weightData.length >= 2 && initialWeight && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>
            {getWeightProgress().change < 0 ? 'Lost' : 'Gained'}:
          </Text>
          <Text style={[
            styles.progressValue,
            { color: getWeightProgress().change < 0 ? '#4ade80' : '#f87171' }
          ]}>
            {Math.abs(getWeightProgress().change).toFixed(1)} kg
            {' '}
            ({Math.abs(getWeightProgress().percentage).toFixed(1)}%)
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#042f2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden', // Ensure chart doesn't overflow rounded corners
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5eead4',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#99f6e4',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  loadingText: {
    textAlign: 'center',
    padding: 30,
    color: '#99f6e4',
  },
  noDataText: {
    textAlign: 'center',
    padding: 30,
    color: '#99f6e4',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(94, 234, 212, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#99f6e4',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ccfbf1',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(94, 234, 212, 0.1)',
  },
  progressLabel: {
    fontSize: 14,
    color: '#99f6e4',
    marginRight: 5,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  clickableText: {
    textDecorationLine: 'underline',
    color: '#5eead4',
  },
  // Dropdown styles
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 118, 110, 0.3)',
  },
  dropdownButtonText: {
    fontSize: 12,
    color: '#99f6e4',
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 16,
  },
  dropdownMenu: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    overflow: 'hidden',
    width: 150,
    marginTop: 60,
    marginRight: 16,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(94, 234, 212, 0.1)',
  },
  dropdownItemSelected: {
    backgroundColor: '#134e4a',
  },
  dropdownItemText: {
    color: '#ccfbf1',
    fontSize: 14,
  },
  dropdownItemTextSelected: {
    color: '#5eead4',
    fontWeight: 'bold',
  },
});

export default WeightProgressionChartCard; 