import React from 'react';
import { View, StyleSheet, useWindowDimensions, Text } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import ChartCard, { ChartCardProps } from './ChartCard';
import { TimePeriod } from './TimeFilter';

export interface BarChartDataPoint {
  date: string;
  value: number;
}

export interface FormattedDataPoint {
  label: string;
  value: number;
}

interface BarChartCardProps extends Omit<ChartCardProps, 'children'> {
  data: BarChartDataPoint[];
  period: TimePeriod;
  yAxisSuffix?: string;
  yAxisLabel?: string;
  color?: string;
  emptyStateMessage?: string;
  formatYLabel?: (yValue: string) => string;
  yAxisLabelXOffset?: number;
}

export default function BarChartCard({ 
  title, 
  metrics, 
  data = [],
  period, 
  yAxisSuffix = '',
  yAxisLabel = '',
  color = '#14b8a6',
  emptyStateMessage,
  formatYLabel,
  yAxisLabelXOffset
}: BarChartCardProps) {
  const { width } = useWindowDimensions();
  const chartWidth = width - 80; // Preserve the existing width setting

  // Get full range data for the period (including days with no workouts)
  const fullRangeData = getFullRangeDataForPeriod(data, period);
  
  // Format data based on selected time period
  const formattedData = formatDataForPeriod(fullRangeData, period);
  
  // Ensure we have at least one data point to prevent rendering errors
  if (formattedData.length === 0) {
    formattedData.push({ label: '', value: 0 });
  }

  // Chart data structure
  const chartData = {
    labels: formattedData.map(item => item.label),
    datasets: [
      {
        data: formattedData.map(item => item.value),
        color: () => color,
      },
    ],
  };

  // Determine maximum value for Y-axis scale and round it to nearest 10
  const maxValue = Math.max(...formattedData.map(item => item.value), 1);
  const roundedMaxValue = Math.ceil(maxValue / 10) * 10; // Round to nearest multiple of 10
  const yAxisMax = Math.ceil(roundedMaxValue * 1.1); // Add 10% headroom
  
  // Check if we should show empty state message
  const showEmptyState = data.length === 0 && emptyStateMessage;

  // Calculate optimal bar width based on number of bars
  // More bars = narrower bars to prevent overlap
  const barPercentage = Math.min(0.7, 0.9 / Math.sqrt(formattedData.length));

  return (
    <ChartCard title={title} metrics={metrics}>
      <View style={styles.chartWrapper}>
        {showEmptyState ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>{emptyStateMessage}</Text>
          </View>
        ) : (
          // Negative left margin container to shift chart left
          <View style={styles.chartShiftContainer}>
            {/* Add explicit left padding to ensure y-axis labels are visible */}
            <View style={{ paddingLeft: 10 }}>
              <BarChart
                data={chartData}
                width={chartWidth}
                height={200} // Maintain reduced height for custom X-axis labels
                yAxisLabel={yAxisLabel}
                yAxisSuffix={yAxisSuffix}
                chartConfig={{
                  backgroundColor: '#0d3d56',
                  backgroundGradientFrom: '#0d3d56',
                  backgroundGradientTo: '#0d3d56',
                  decimalPlaces: 0,
                  color: () => color,
                  fillShadowGradient: color,
                  fillShadowGradientOpacity: 1,
                  labelColor: () => 'rgba(94, 234, 212, 1)',
                  // Adjust bar width based on number of bars to prevent overlap
                  barPercentage: barPercentage,
                  barRadius: 5,
                  propsForBackgroundLines: {
                    strokeDasharray: ['6', '6'],
                    stroke: "rgba(94, 234, 212, 0.2)",
                  },
                  propsForLabels: {
                    fontSize: 11,
                    fontFamily: 'Inter-Regular',
                    // Use configurable X offset for Y-axis labels
                    x: yAxisLabelXOffset || 16,
                    fill: 'rgba(94, 234, 212, 1)',
                    fontWeight: '500',
                  },
                  // Use custom formatter if provided, otherwise use default
                  formatYLabel: formatYLabel || (yValue => yValue),
                  // Hide original X labels, we'll use custom ones
                  formatXLabel: (xLabel: string) => "", 
                  style: {
                    borderRadius: 16,
                    paddingLeft: 40, // Reduced to decrease space between Y-axis and first bar
                    paddingRight: 10,
                    paddingBottom: 0,
                  },
                  strokeWidth: 1,
                }}
                withInnerLines={true}
                fromZero
                showValuesOnTopOfBars={false}
                showBarTops={false}
                segments={4}
                style={styles.chart}
                withHorizontalLabels={true}
                withVerticalLabels={false} // Turn off built-in X-axis labels
                horizontalLabelRotation={0}
                verticalLabelRotation={0}
              />
              
              {/* Custom X-axis labels with improved positioning */}
              <XAxisLabels 
                labels={formattedData.map(item => item.label)} 
                width={chartWidth - 60} // Adjusted width to better match bars
                color="rgba(94, 234, 212, 1)"
                labelCount={formattedData.length}
                period={period}
              />
            </View>
          </View>
        )}
      </View>
    </ChartCard>
  );
}

// Custom component to render X-axis labels with improved positioning
function XAxisLabels({ 
  labels, 
  width, 
  color, 
  labelCount,
  period
}: { 
  labels: string[], 
  width: number, 
  color: string,
  labelCount: number,
  period?: TimePeriod
}) {
  // Only render if we have labels
  if (!labels || labels.length === 0) return null;
  
  // For 14D period, only show every other label to prevent crowding
  let displayLabels = [...labels];
  let displayIndices: number[] = [];
  
  if (period === '14D' && labels.length > 7) {
    // Create array of indices to display, avoiding duplicates
    const uniqueLabels = new Set<string>();
    const indexesToDisplay: number[] = [];
    
    // First pass: collect all unique labels and their first occurrence
    const labelFirstIndexMap = new Map<string, number>();
    labels.forEach((label, index) => {
      if (!labelFirstIndexMap.has(label)) {
        labelFirstIndexMap.set(label, index);
      }
    });
    
    // Add indices of first occurrence of each unique label
    for (let i = 0; i < labels.length; i += 2) { // Every other index
      const label = labels[i];
      if (!uniqueLabels.has(label)) {
        uniqueLabels.add(label);
        indexesToDisplay.push(i);
      }
    }
    
    // If we have few unique labels, add more to ensure sufficient spacing
    if (indexesToDisplay.length < 5 && labels.length > 5) {
      for (let i = 1; i < labels.length; i += 2) {
        const label = labels[i];
        if (!uniqueLabels.has(label)) {
          uniqueLabels.add(label);
          indexesToDisplay.push(i);
          if (indexesToDisplay.length >= 7) break; // Limit number of labels
        }
      }
    }
    
    // Sort indices to maintain correct order
    displayIndices = indexesToDisplay.sort((a, b) => a - b);
  } else {
    // For other periods, show all labels
    displayIndices = labels.map((_, i) => i);
  }
  
  // Special adjustment for few bars - they need more offset
  let leftMargin = 55;
  
  if (labelCount === 2) {
    leftMargin = 24;
  } else if (labelCount === 3) {
    leftMargin = 38;
  } else if (labelCount <= 5) {
    leftMargin = 52;
  } else if (labelCount >= 7) {
    // For many bars, adjust margin to account for crowding
    leftMargin = 58;
  }
  
  // Calculate width for each label section
  const sectionWidth = width / labelCount;
  
  // If we have many bars, add a limit to minimum section width
  // to avoid text overlap
  const isManyBars = labelCount > 6;
  
  return (
    <View style={[
      styles.xAxisLabelsContainer, 
      { 
        marginLeft: leftMargin,
        width: width,
        marginTop: 0 
      }
    ]}>
      {labels.map((label, index) => {
        // Only render labels at selected indices
        const shouldDisplay = displayIndices.includes(index);
        
        // For many bars, use a more compact label rendering
        const compactText = isManyBars ? { fontSize: 9 } : {};
        
        return (
          <View 
            key={`label-${index}`} 
            style={[
              styles.xAxisLabelSection, 
              { width: sectionWidth }
            ]}
          >
            {shouldDisplay && (
              <Text style={[styles.xAxisLabelText, compactText, { color }]}>
                {label}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

// Helper function to generate a full range of dates for a period
function getFullRangeDataForPeriod(data: BarChartDataPoint[], period: TimePeriod): BarChartDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Get the date range for the selected period
  const now = new Date();
  let startDate = new Date();
  
  switch(period) {
    case '7D':
      startDate.setDate(now.getDate() - 7);
      break;
    case '14D':
      startDate.setDate(now.getDate() - 14);
      break;
    case '1M':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '12M':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'ALL':
      // For ALL period, use the earliest workout date
      const dates = data.map(d => new Date(d.date).getTime());
      if (dates.length > 0) {
        startDate = new Date(Math.min(...dates));
      }
      break;
  }
  
  // Create a map of existing data by date string
  const dataByDate = new Map<string, number>();
  data.forEach(item => {
    const dateStr = new Date(item.date).toISOString().split('T')[0];
    dataByDate.set(dateStr, item.value);
  });
  
  // If ALL period with no data, just return empty array
  if (period === 'ALL' && dataByDate.size === 0) {
    return [];
  }
  
  // Generate full date range including days with no data (except for ALL period)
  const fullRangeData: BarChartDataPoint[] = [];
  const endDate = now;
  
  if (period === 'ALL') {
    // For ALL period, just use the existing data
    return data;
  } else {
    // For other periods, generate the full date range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      fullRangeData.push({
        date: dateStr,
        value: dataByDate.get(dateStr) || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return fullRangeData;
}

// Helper function to format data based on time period
function formatDataForPeriod(data: BarChartDataPoint[], period: TimePeriod): FormattedDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Sort data by date
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  switch (period) {
    case '7D':
      // For 7 day period, show all daily labels
      return sortedData.map(item => {
        const date = new Date(item.date);
        return {
          label: `${date.getDate()}`,
          value: item.value
        };
      });
    
    case '14D':
      // For 14 day period, show all data points with day labels
      return sortedData.map(item => {
        const date = new Date(item.date);
        return {
          label: `${date.getDate()}`,
          value: item.value
        };
      });
      
    case '1M':
      // For medium periods, show weekly intervals with clearer labels
      const weeklyData: {[key: string]: number} = {};
      sortedData.forEach(item => {
        const date = new Date(item.date);
        const weekNumber = Math.floor(date.getDate() / 7) + 1;
        const weekLabel = `W${weekNumber}`;
        weeklyData[weekLabel] = (weeklyData[weekLabel] || 0) + item.value;
      });
      
      return Object.entries(weeklyData).map(([label, value]) => ({ label, value }));
      
    case '12M':
    case 'ALL':
      // For longer periods, show abbreviated month names only
      const monthlyData: {[key: string]: number} = {};
      sortedData.forEach(item => {
        const date = new Date(item.date);
        // Get short month name (3 letters)
        const monthLabel = date.toLocaleString('default', { month: 'short' }).substring(0, 3);
        monthlyData[monthLabel] = (monthlyData[monthLabel] || 0) + item.value;
      });
      
      return Object.entries(monthlyData).map(([label, value]) => ({ label, value }));
      
    default:
      return sortedData.map(item => {
        const date = new Date(item.date);
        return {
          label: `${date.getDate()}`,
          value: item.value
        };
      });
  }
}

const styles = StyleSheet.create({
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    position: 'relative',
    overflow: 'visible',
    paddingBottom: 8,
  },
  chartShiftContainer: {
    marginLeft: -10,
  },
  chart: {
    marginVertical: 0,
    borderRadius: 16,
    paddingBottom: 0,
  },
  horizontalGridLine: {
    position: 'absolute',
    left: 50, // Start at y-axis
    right: 20, // End at right boundary
    height: 1,
    backgroundColor: 'rgba(94, 234, 212, 0.2)',
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: 'rgba(94, 234, 212, 0.2)',
    borderRadius: 1,
    zIndex: 5,
  },
  emptyStateContainer: {
    height: 220,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: '#5eead4',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  xAxisLabelsContainer: {
    flexDirection: 'row',
  },
  xAxisLabelSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  xAxisLabelText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
}); 