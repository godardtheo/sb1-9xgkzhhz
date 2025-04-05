import React, { useState, useMemo, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions, Text, Pressable, ScrollView, Platform } from 'react-native';
import ChartCard, { ChartCardProps } from './ChartCard';
import { TimePeriod } from './TimeFilter';
import { LinearGradient } from 'react-native-svg';

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
  segments?: number;
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
  formatYLabel = (yValue) => yValue,
  yAxisLabelXOffset,
  segments = 4
}: BarChartCardProps) {
  const { width } = useWindowDimensions();
  const chartWidth = width - 80; // Preserve the existing width setting
  const chartHeight = 180; // Slightly reduced height
  const Y_AXIS_WIDTH = 50; // Space for Y-axis labels
  const MAX_SEGMENTS = 6; // Max number of dashed lines (segments+1 total lines including zero)
  
  // State to track selected bar for tooltip
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  
  // Memoize data processing to prevent recalculation on every render
  const fullRangeData = useMemo(() => 
    getFullRangeDataForPeriod(data, period), 
    [data, period]
  );
  
  // Memoize formatted data to prevent recalculation on every render
  const formattedData = useMemo(() => {
    let formatted = formatDataForPeriod(fullRangeData, period);
    
    // Filter labels for 14D to show only 1 out of 4 labels
    if (period === '14D' && formatted.length > 7) {
      formatted = formatted.map((item, index) => {
        return {
          ...item,
          // Only display label for every fourth day
          displayLabel: index % 4 === 0
        };
      });
    } else {
      formatted = formatted.map(item => ({
        ...item,
        displayLabel: true
      }));
    }
    
    // Ensure we have at least one data point to prevent rendering errors
    if (formatted.length === 0) {
      return [{ label: '', value: 0, displayLabel: true }];
    }
    return formatted;
  }, [fullRangeData, period]);

  // Calculate max value for Y axis scaling
  const maxValue = useMemo(() => {
    const max = Math.max(...formattedData.map(item => item.value), 1);
    // Round up to nice number based on magnitude
    if (max <= 10) return Math.ceil(max * 1.2); // Small values, round to nearest 1
    if (max <= 100) return Math.ceil(max * 1.1 / 5) * 5; // Medium values, round to nearest 5
    return Math.ceil(max * 1.1 / 10) * 10; // Large values, round to nearest 10
  }, [formattedData]);
  
  // Generate Y axis tick values - limited to MAX_SEGMENTS+1 values (including 0)
  const yTicks = useMemo(() => {
    // Use the smaller of segments or MAX_SEGMENTS
    const tickCount = Math.min(segments, MAX_SEGMENTS);
    const interval = maxValue / tickCount;
    return Array.from({ length: tickCount + 1 }, (_, i) => i * interval);
  }, [maxValue, segments]);

  // Check if we should show empty state message
  const showEmptyState = useMemo(() => 
    data.length === 0 && emptyStateMessage, 
    [data.length, emptyStateMessage]
  );
  
  // Handle bar selection
  const handleBarPress = (index: number) => {
    setSelectedBarIndex(prev => prev === index ? null : index);
  };

  // Format X-axis label for display
  const formatXAxisLabel = (item: FormattedDataPoint & { displayLabel?: boolean }, index: number) => {
    // Don't display label if displayLabel is false
    if (item.displayLabel === false) return '';
    
    // For 7D and 14D, show dd/mm format
    if (period === '7D' || period === '14D') {
      const matchedData = data.find(d => {
        const dateObj = new Date(d.date);
        return dateObj.getDate().toString() === item.label;
      });
      
      if (matchedData) {
        const date = new Date(matchedData.date);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }
    }
    
    return item.label;
  };

  // Format tooltip label
  const formatTooltipLabel = (label: string, index: number) => {
    const originalData = data.find(d => {
      const dateObj = new Date(d.date);
      const dayStr = dateObj.getDate().toString();
      const monthStr = dateObj.toLocaleString('default', { month: 'short' }).substring(0, 3);
      return dayStr === label || monthStr === label;
    });
    
    if (!originalData) return label;
    
    const date = new Date(originalData.date);
    
    switch(period) {
      case '7D':
      case '14D':
        // Format as dd/mm
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      case '1M':
        // Just W# without "Week"
        return `W${label.replace('W', '')}`;
      case '12M':
      case 'ALL':
        // Short month + year (last 2 digits)
        const yearSuffix = date.getFullYear().toString().slice(-2);
        return `${label} ${yearSuffix}`;
      default:
        return label;
    }
  };
  
  // Format tooltip value with unit
  const formatTooltipValue = (value: number) => {
    // Format for duration (convert minutes to HH:MM)
    if (yAxisSuffix === 'min') {
      const hours = Math.floor(value / 60);
      const minutes = Math.floor(value % 60);
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // Default formatting for other units
    return value.toString();
  };

  // If we need to show the empty state message
  if (showEmptyState) {
    return (
      <ChartCard title={title} metrics={metrics}>
        <View style={styles.chartWrapper}>
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>{emptyStateMessage}</Text>
          </View>
        </View>
      </ChartCard>
    );
  }
  
  // Calculate the ideal bar width based on number of bars and chart width
  const effectiveChartWidth = chartWidth - Y_AXIS_WIDTH;
  const idealBarWidth = Math.min(60, effectiveChartWidth / formattedData.length);
  const barContainerWidth = formattedData.length * idealBarWidth;
  const needsScrolling = barContainerWidth > effectiveChartWidth;

  return (
    <ChartCard title={title} metrics={metrics}>
      <View style={styles.chartWrapper}>
        {/* Extra spacing added between metrics and chart */}
        <View style={styles.spacer} />
        
        <View style={styles.chartContainer}>
          <View style={{ height: chartHeight, width: chartWidth }}>
            {/* Y-axis labels - positioned above each line */}
            <View style={[styles.yAxisLabels, { width: Y_AXIS_WIDTH }]}>
              {yTicks.map((tick, i) => {
                return (
                  <Text 
                    key={`y-tick-${i}`} 
                    style={[
                      styles.yAxisLabel,
                      { 
                        // Position above the line
                        bottom: (i * chartHeight / yTicks.length) + 5
                      }
                    ]}
                  >
                    {formatYLabel(tick.toString())}
                    {i === yTicks.length - 1 && yAxisSuffix ? ` ${yAxisSuffix}` : ''}
                  </Text>
                );
              })}
            </View>
            
            <View style={styles.chartContent}>
              {/* Horizontal grid lines - positioned from bottom */}
              {yTicks.map((tick, i) => {
                return (
                  <View 
                    key={`grid-${i}`} 
                    style={[
                      styles.gridLine,
                      { 
                        // Position from bottom to top
                        bottom: (i * chartHeight / yTicks.length)
                      }
                    ]} 
                  />
                );
              })}
              
              {/* Chart area with scrolling for many bars */}
              <ScrollView 
                horizontal={needsScrolling}
                showsHorizontalScrollIndicator={false}
                scrollEnabled={needsScrolling} // Only enable horizontal scrolling
                style={styles.scrollView}
                contentContainerStyle={[
                  styles.scrollViewContent,
                  { width: needsScrolling ? barContainerWidth : '100%' }
                ]}
              >
                {/* Bars container */}
                <View style={styles.barsContainer}>
                  {formattedData.map((item, index) => {
                    // Skip rendering bars for zero values
                    if (item.value === 0) {
                      return (
                        <View 
                          key={`empty-bar-${index}`}
                          style={[
                            styles.barWrapper,
                            { width: idealBarWidth }
                          ]}
                        >
                          {/* Just render X-axis label for zero values */}
                          <Text style={styles.xAxisLabel}>
                            {formatXAxisLabel(item, index)}
                          </Text>
                        </View>
                      );
                    }
                    
                    // Calculate height as percentage of chart height
                    const barHeightPercent = item.value / maxValue;
                    const barHeight = barHeightPercent * (chartHeight - 25); // Subtract padding for x-axis labels
                    const isSelected = selectedBarIndex === index;
                    
                    return (
                      <Pressable 
                        key={`bar-${index}`}
                        style={[
                          styles.barWrapper,
                          { width: idealBarWidth }
                        ]}
                        onPress={() => handleBarPress(index)}
                      >
                        {/* Actual bar with gradient */}
                        <View 
                          style={[
                            styles.bar,
                            { 
                              height: Math.max(barHeight, 5),
                              backgroundColor: isSelected ? '#FF90B3' : color,
                              overflow: 'hidden'
                            }
                          ]}
                        >
                          {!isSelected && (
                            <View style={[styles.barGradient, { backgroundColor: color }]} />
                          )}
                        </View>
                        
                        {/* X-axis label */}
                        <Text style={styles.xAxisLabel}>
                          {formatXAxisLabel(item, index)}
                        </Text>
                        
                        {/* Tooltip for selected bar - positioned with absolute position */}
                        {isSelected && (
                          <View 
                            style={[
                              styles.tooltip,
                              {
                                // Position tooltip so it's always visible
                                bottom: barHeight + 10,
                                // Adjust left position to ensure it's not cut off
                                left: index === formattedData.length - 1 ? 
                                  'auto' : '50%',
                                right: index === formattedData.length - 1 ? 
                                  0 : 'auto',
                                transform: index === formattedData.length - 1 ? 
                                  [{ translateX: 0 }] : [{ translateX: -40 }]
                              }
                            ]}
                          >
                            <View style={styles.tooltipContent}>
                              <View style={styles.tooltipInnerContent}>
                                <Text style={styles.tooltipLabel}>
                                  {formatTooltipLabel(item.label, index)}:
                                </Text>
                                <View style={styles.tooltipValueContainer}>
                                  <Text style={styles.tooltipValue}>
                                    {formatTooltipValue(item.value)}
                                  </Text>
                                  {yAxisSuffix && yAxisSuffix !== 'min' && (
                                    <Text style={styles.tooltipUnit}>{yAxisSuffix}</Text>
                                  )}
                                </View>
                              </View>
                            </View>
                            <View style={styles.tooltipArrow} />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </ChartCard>
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
    case '14D':
      // For 7/14 day period, show all daily labels
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
    flex: 1,
    width: '100%',
  },
  spacer: {
    height: 20, // Extra space between metrics and chart
  },
  chartContainer: {
    position: 'relative',
    height: 220, // Reduced height
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 180, // Adjusted height
  },
  emptyStateText: {
    color: 'rgba(94, 234, 212, 0.6)',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  chartContent: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    paddingLeft: 50, // Space for Y-axis labels
    height: 180, // Adjusted height
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: 50,
    zIndex: 10,
  },
  yAxisLabel: {
    color: 'rgba(94, 234, 212, 1)',
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    textAlign: 'right',
    position: 'absolute',
    right: 5,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(94, 234, 212, 0.2)',
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: 'rgba(94, 234, 212, 0.2)',
  },
  scrollView: {
    flex: 1,
    height: '100%', // Ensure no vertical scrolling
  },
  scrollViewContent: {
    flexGrow: 1,
    height: '100%', // Ensure no vertical scrolling
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 25, // Space for X-axis labels
  },
  barWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    position: 'relative',
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  barGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.7,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    // Gradient effect
    borderTopWidth: 5,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  xAxisLabel: {
    color: 'rgba(94, 234, 212, 1)',
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 5,
    textAlign: 'center',
    width: '100%',
  },
  tooltip: {
    position: 'absolute',
    zIndex: 100, // Much higher z-index to ensure visibility
    width: 80, // Fixed width for consistent look
  },
  tooltipContent: {
    backgroundColor: '#115e59',
    borderRadius: 8,
    padding: 8,
    width: '100%',
  },
  tooltipInnerContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderBottomWidth: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#115e59',
    alignSelf: 'center',
  },
  tooltipLabel: {
    color: '#5eead4',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginRight: 4,
  },
  tooltipValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tooltipValue: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  tooltipUnit: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    marginLeft: 2,
  },
}); 