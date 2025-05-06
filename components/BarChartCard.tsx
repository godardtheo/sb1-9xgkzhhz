import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, Text, Pressable, ScrollView, Platform, ViewStyle, LayoutChangeEvent, LayoutRectangle } from 'react-native';
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
  displayLabel?: boolean;
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
  tooltipValueSuffix?: string;
  yAxisTicks?: number[];
}

// Fix Y_AXIS_WIDTH reference by moving it outside of the component
const Y_AXIS_WIDTH = 50; // Space for Y-axis labels

// Constants for tooltip sizing - set a default but allow expansion
const DEFAULT_TOOLTIP_WIDTH = 60; // Increased from 80 to accommodate more content

// Standardize default color for all charts
const DEFAULT_BAR_COLOR = '#14b8a6'; // Teal color

export default function BarChartCard({ 
  title, 
  metrics, 
  data = [],
  period, 
  yAxisSuffix = '',
  yAxisLabel = '',
  color = DEFAULT_BAR_COLOR, // Use the standardized color as default
  emptyStateMessage,
  formatYLabel = (yValue) => yValue,
  yAxisLabelXOffset,
  segments = 4,
  tooltipValueSuffix,
  yAxisTicks: customYAxisTicks
}: BarChartCardProps) {
  const { width } = useWindowDimensions();
  const chartWidth = width - 80; // Preserve the existing width setting
  const chartHeight = 180; // Chart area height
  const MAX_SEGMENTS = 6; // Max number of dashed lines (segments+1 total lines including zero)
  
  // State for bar selection and positioning
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [barLayouts, setBarLayouts] = useState<Array<LayoutRectangle | null>>([]);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  
  // ScrollView refs
  const scrollViewRef = useRef<ScrollView>(null);
  const labelScrollViewRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);
  
  // Add state to track tooltip width for adaptive sizing
  const [tooltipWidth, setTooltipWidth] = useState(DEFAULT_TOOLTIP_WIDTH);
  
  // Reset selected bar and tooltip visibility when period changes
  useEffect(() => {
    setSelectedBarIndex(null);
    setIsTooltipVisible(false);
  }, [period]);
  
  // Step 2b: Log when data prop changes
  /*
  useEffect(() => {
    console.log(`[Tooltip Debug] useEffect[data]: data prop changed. Length: ${data?.length || 0}`);
  }, [data]);
  */
  
  // Process data for display
  const fullRangeData = useMemo(() => 
    getFullRangeDataForPeriod(data, period), 
    [data, period]
  );
  
  // Format data for the current period
  const formattedData = useMemo(() => {
    let formatted = formatDataForPeriod(fullRangeData, period);
    
    // Filter labels for 14D to show only 1 out of 4 labels
    if (period === '14D' && formatted.length > 7) {
      formatted = formatted.map((item, index) => ({
        ...item,
        displayLabel: index % 4 === 0
      }));
    }
    
    // Empty state fallback
    if (formatted.length === 0) {
      return [{ label: '', value: 0, displayLabel: true }];
    }
    
    return formatted;
  }, [fullRangeData, period]);
  
  // 1. Domain-Specific Y-Axis Scaling: Calculate optimal max value based on data type
  const maxValue = useMemo(() => {
    const max = Math.max(...formattedData.map(item => item.value), 1);
    
    // For time values (minutes)
    if (yAxisSuffix === 'min') {
      // For durations, use multiples of 15min or 30min that make sense
      if (max <= 30) return Math.ceil(max / 15) * 15;        // 15min increments
      if (max <= 120) return Math.ceil(max / 30) * 30;       // 30min increments
      return Math.ceil(max / 60) * 60;                       // 1hr increments
    }
    
    // For sets or other integer values, use clean intervals
    if (max <= 5) return 5;                                 // 0-5 range
    if (max <= 10) return 10;                               // 0-10 range
    if (max <= 20) return Math.ceil(max / 5) * 5;           // Multiples of 5
    if (max <= 100) return Math.ceil(max / 10) * 10;        // Multiples of 10
    return Math.ceil(max / 50) * 50;                        // Multiples of 50
  }, [formattedData, yAxisSuffix]);
  
  // 2. Adaptive Segment Count: Adjust number of segments based on data range
  const segmentCount = useMemo(() => {
    // For small max values, fewer segments look better
    if (maxValue <= 5) return 5;
    if (maxValue <= 20) return Math.ceil(maxValue / 5);     // For 15, create 3 segments
    // For larger values, use default but ensure appropriate density
    return Math.min(segments, MAX_SEGMENTS);
  }, [maxValue, segments, MAX_SEGMENTS]);
  
  // 3. Generate Clean, Even Intervals: Create visually appealing tick marks
  const { yTicks, adjustedMax } = useMemo(() => {
    // If custom ticks are provided, use them directly
    if (customYAxisTicks && customYAxisTicks.length > 0) {
      const sortedTicks = [...customYAxisTicks].sort((a, b) => a - b);
      const maxTick = sortedTicks[sortedTicks.length - 1] || 1; // Use last tick as max, default to 1
      return { yTicks: sortedTicks, adjustedMax: maxTick };
    }

    // --- Fallback to existing automatic calculation if custom ticks are not provided ---
    // Calculate interval and ensure it's a clean number
    let interval = maxValue / segmentCount;
    
    // If interval is not an integer, round to next nice number
    if (interval !== Math.floor(interval)) {
      if (interval < 1) interval = 1;
      else if (interval < 5) interval = Math.ceil(interval);
      else interval = Math.ceil(interval / 5) * 5;
    }
    
    // Recalculate max value to ensure it's divisible by interval
    const adjustedMax = Math.ceil(maxValue / interval) * interval;
    
    // Generate ticks from 0 to adjusted max
    const ticks = Array.from(
      { length: Math.floor(adjustedMax / interval) + 1 }, 
      (_, i) => i * interval
    );
    
    return { yTicks: ticks, adjustedMax };
  }, [maxValue, segmentCount, customYAxisTicks]);
  
  // Handle bar selection - Step 1: Fix deselection logic
  const handleBarPress = (index: number) => {
    // console.log(`[Tooltip Debug] handleBarPress: Pressed bar index ${index}. Current selected: ${selectedBarIndex}`);
    // Correctly check if the pressed bar is the currently selected one
    if (selectedBarIndex === index) {
        // Deselecting
        // console.log(`[Tooltip Debug] handleBarPress: Deselecting bar ${index}`); // Correct log placement
        setSelectedBarIndex(null);
        setIsTooltipVisible(false);
    } else {
        // Selecting a new bar
        // console.log(`[Tooltip Debug] handleBarPress: Selecting bar ${index}`);
        setSelectedBarIndex(index);
        setIsTooltipVisible(false); // Hide tooltip until layout is confirmed by useEffect
    }
  };
  
  // Store bar layout information when rendered
  const handleBarLayout = (index: number, event: LayoutChangeEvent) => {
    const layout = event.nativeEvent.layout;
    // console.log(`[Tooltip Debug] handleBarLayout: Layout for bar ${index}:`, layout);
    setBarLayouts(prev => {
      const newLayouts = [...prev];
      // Step 3: Force update on every layout measurement (remove optimization check)
      // console.log(`[Tooltip Debug] handleBarLayout: Forcing layout state update for bar ${index}`);
      newLayouts[index] = layout;
      return newLayouts;
    });
  };
  
  // Step 3: Use useEffect to show tooltip only when layout is ready
  useEffect(() => {
    // console.log(`[Tooltip Debug] useEffect[selectedBarIndex, barLayouts]: Running. selectedBarIndex=${selectedBarIndex}`);
    // Check if selectedBarIndex is not null before accessing barLayouts for logging
    /*
    if (selectedBarIndex !== null) {
      console.log(`[Tooltip Debug] useEffect: Layout for selected bar ${selectedBarIndex}:`, barLayouts[selectedBarIndex]);
    }
    */

    // Check if layout is available for the selected bar
    const layoutReady = selectedBarIndex !== null && !!barLayouts[selectedBarIndex];

    if (layoutReady) {
        // console.log(`[Tooltip Debug] useEffect: Conditions met for bar ${selectedBarIndex}. Setting isTooltipVisible=true`);
        // Layout is ready for the selected bar
        setIsTooltipVisible(true);
    } else {
        // console.log(`[Tooltip Debug] useEffect: Conditions not met (selectedBarIndex=${selectedBarIndex}, layout ready=${layoutReady}). Setting isTooltipVisible=false`);
        // No bar selected or layout not ready/available
        setIsTooltipVisible(false);
    }
    // Add barLayouts[selectedBarIndex] to dependencies to react to specific layout changes? No, triggers too often.
  }, [selectedBarIndex, barLayouts]); // Dependencies: selection and layouts
  
  // Calculate bar container width and ideal bar width
  const effectiveChartWidth = chartWidth - Y_AXIS_WIDTH;
  
  // Ensure all bars fit within available width, no scrolling
  let idealBarWidth: number;
  
  // Always calculate bar width based on available space and number of bars
  idealBarWidth = effectiveChartWidth / formattedData.length;
  
  // Ensure bar width is never too small (floor of 15px)
  idealBarWidth = Math.max(idealBarWidth, 15);
  
  // Calculate total width needed for all bars
  const barContainerWidth = effectiveChartWidth;
  
  // No scrolling needed anymore
  const needsScrolling = false;
  
  // Remove scroll handling since we're not scrolling anymore
  const handleScroll = () => {};
  
  // Format X-axis label for display
  const formatXAxisLabel = (item: FormattedDataPoint, index: number): string => {
    // Don't display label if displayLabel is false
    if (item.displayLabel === false) return '';
    
    // For 7D and 14D, show dd/mm format always
    if (period === '7D' || period === '14D') {
      // Get date string from original data for this date
      const dateStr = getDateStringForIndex(index);
      if (dateStr) {
        const date = new Date(dateStr);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }
    }
    
    return item.label;
  };
  
  // Helper function to get date string from original data
  const getDateStringForIndex = (index: number): string | null => {
    // For 7D and 14D use the date index to find the matching date
    if (period === '7D' || period === '14D') {
      // Formatted data has all days, so we can determine the date from the index
      if (fullRangeData[index]) {
        return fullRangeData[index].date;
      }
    }
    
    // Fallback: Try to match by day value
    const dayLabel = formattedData[index]?.label;
    const matchedData = data.find(d => {
      const dateObj = new Date(d.date);
      return dateObj.getDate().toString() === dayLabel;
    });
    
    return matchedData?.date || null;
  };
  
  // Format tooltip label
  const formatTooltipLabel = (label: string, index: number): string => {
    if (period === '7D' || period === '14D') {
      const dateStr = getDateStringForIndex(index);
      if (dateStr) {
        const date = new Date(dateStr);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }
    }
    return label;
  };
  
  // Format tooltip value
  const formatTooltipValue = (value: number): string => {
    // Special handling for WorkoutsDurationChartCard (title === "Workouts")
    if (title === "Workouts") {
      // Format minutes as h:mm format (matching y-axis labels)
      const hours = Math.floor(value / 60);
      const mins = Math.round(value % 60);
      return `${hours}:${mins.toString().padStart(2, '0')}`;
    }
    // Original handling for other yAxisSuffix cases
    else if (yAxisSuffix === 'min') {
      // Format minutes as h:mm format (matching y-axis labels)
      const hours = Math.floor(value / 60);
      const mins = Math.round(value % 60);
      return `${hours}:${mins.toString().padStart(2, '0')}`;
    }
    return value.toString();
  };
  
  // Adjust the chartContainer height to account for labels below
  const chartContainerHeight = chartHeight + 30; // Added space for labels below
  
  // Render empty state if needed
  if (data.length === 0 && emptyStateMessage) {
    return (
      <ChartCard title={title} metrics={metrics}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>{emptyStateMessage}</Text>
        </View>
      </ChartCard>
    );
  }
  
  return (
    <ChartCard title={title} metrics={metrics}>
      <View style={styles.chartWrapper}>
        <View style={styles.spacer} />
        
        <View style={[styles.chartContainer, { height: chartContainerHeight }]}>
          <View style={[
            { height: chartContainerHeight, width: chartWidth },
            styles.chartContentWrapper
          ]}>
            {/* Y-axis labels */}
            <View style={[styles.yAxisLabels, { width: Y_AXIS_WIDTH }]}>
              {yTicks.map((tick, i) => (
                <Text 
                  key={`y-tick-${i}`} 
                  style={[
                    styles.yAxisLabel,
                    { 
                      bottom: adjustedMax > 0 ? (tick / adjustedMax) * chartHeight + 28 : 28,
                      height: 20,
                      lineHeight: 20
                    }
                  ]}
                >
                  {formatYLabel(tick.toString())}
                  {i === yTicks.length - 1 && yAxisSuffix ? ` ${yAxisSuffix}` : ''}
                </Text>
              ))}
            </View>
            
            {/* Chart content with grid lines and bars */}
            <View style={styles.chartContent}>
              {/* Grid lines */}
              {yTicks.map((tick, i) => (
                <View 
                  key={`grid-${i}`}
                  style={[
                    styles.gridLine,
                    { 
                      bottom: adjustedMax > 0 ? (tick / adjustedMax) * chartHeight : 0
                    }
                  ]}
                />
              ))}
              
              {/* Chart area with bars */}
              <ScrollView 
                ref={scrollViewRef}
                horizontal={false}
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false} 
                style={styles.scrollView}
                contentContainerStyle={[
                  styles.scrollViewContent,
                  { width: effectiveChartWidth }
                ]}
              >
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
                          {/* Empty space for zero value */}
                        </View>
                      );
                    }
                    
                    // Calculate height using adjustedMax instead of maxValue
                    const barHeightPercent = adjustedMax > 0 ? item.value / adjustedMax : 0;
                    const barHeight = barHeightPercent * chartHeight;
                    const isSelected = selectedBarIndex === index;
                    
                    return (
                      <Pressable 
                        key={`bar-${index}`}
                        style={[
                          styles.barWrapper,
                          { width: idealBarWidth }
                        ]}
                        onPress={() => handleBarPress(index)}
                        onLayout={(event) => handleBarLayout(index, event)}
                      >
                        {/* Actual bar with gradient */}
                        <View 
                          style={[
                            styles.bar,
                            { 
                              height: Math.max(barHeight, 5),
                              backgroundColor: isSelected ? '#FF90B3' : color,
                            }
                          ]}
                        >
                          {/* Remove the gradient view completely */}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
            
            {/* X-axis labels container */}
            <View 
              style={[
                styles.xAxisLabelsWrapper, 
                { paddingLeft: Y_AXIS_WIDTH, width: chartWidth }
              ]}
            >
              <View style={{ flexDirection: 'row', width: effectiveChartWidth }}>
                {formattedData.map((item, index) => {
                  // For 14D period, expand label width when displayed
                  const is14DDisplayedLabel = period === '14D' && item.displayLabel === true;
                  
                  return (
                    <View 
                      key={`x-label-${index}`}
                      style={[
                        styles.xAxisLabelContainer, 
                        { 
                          width: idealBarWidth,
                          // Apply expanded width for visible 14D labels
                          ...(is14DDisplayedLabel && { overflow: 'visible' })
                        }
                      ]}
                    >
                      <Text 
                        style={[
                          styles.xAxisLabel,
                          // Make 14D displayed labels wider
                          is14DDisplayedLabel && { width: idealBarWidth * 3 },
                          // Reduce font size on Android for 7D period
                          Platform.OS === 'android' && period === '7D' && { fontSize: 9 }
                        ]}
                      >
                        {formatXAxisLabel(item, index)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </View>
      
      {/* Tooltip rendered outside chart - with improved positioning */}
      {(() => {
        // Log values used in the render condition
        /*
        const layoutAvailable = selectedBarIndex !== null && !!barLayouts[selectedBarIndex];
        console.log(`[Tooltip Debug] Render check: isTooltipVisible=${isTooltipVisible}, selectedBarIndex=${selectedBarIndex}, layoutAvailable=${layoutAvailable}`);
        */
        
        // Original render condition
        if (isTooltipVisible && selectedBarIndex !== null && barLayouts[selectedBarIndex]) {
          const selectedLayout = barLayouts[selectedBarIndex];
          const tooltipTop = chartContainerHeight - (adjustedMax > 0 ? (((formattedData[selectedBarIndex]?.value || 0) / adjustedMax) * chartHeight) : 0) - 52;
          const tooltipLeft = Y_AXIS_WIDTH + (selectedLayout?.x || 0) + (idealBarWidth / 2) - (tooltipWidth / 2);
          // console.log(`[Tooltip Debug] Rendering Tooltip for bar ${selectedBarIndex}. Calculated Position: top=${tooltipTop}, left=${tooltipLeft}`);
          
          return (
            <View 
              style={[
                styles.tooltip,
                {
                  position: 'absolute',
                  left: tooltipLeft,
                  top: tooltipTop,
                  minWidth: tooltipWidth, // Use measured or default width
                }
              ]}
              onLayout={(e) => {
                // Measure the actual content width and update if needed
                const {width} = e.nativeEvent.layout;
                if (width > tooltipWidth && width > DEFAULT_TOOLTIP_WIDTH) {
                  // console.log(`[Tooltip Debug] Tooltip measured width ${width}, updating state.`);
                  setTooltipWidth(width);
                }
              }}
            >
              <View style={styles.tooltipContent}>
                <View style={styles.tooltipInnerContent}>
                  <Text style={styles.tooltipLabel}>
                    {formatTooltipLabel(formattedData[selectedBarIndex]?.label || '', selectedBarIndex)}:
                  </Text>
                  <View style={styles.tooltipValueContainer}>
                    <Text style={styles.tooltipValue}>
                      {formatTooltipValue(formattedData[selectedBarIndex]?.value || 0)}
                    </Text>
                    {/* Dynamic unit display based on context */}
                    {tooltipValueSuffix && (
                      <Text style={styles.tooltipUnit}>{tooltipValueSuffix}</Text>
                    )}
                    {/* Keep existing suffix for min but only if not using the new formatting */}
                    {!tooltipValueSuffix && yAxisSuffix && yAxisSuffix !== 'min' && (
                      <Text style={styles.tooltipUnit}>{yAxisSuffix}</Text>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.tooltipArrow} />
            </View>
          );
        }
        return null; // Return null if tooltip should not be rendered
      })()}
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
    overflow: 'visible', // Allow children to overflow the container
    zIndex: 1, // Ensure proper stacking
    elevation: 1, // Add elevation for Android
    position: 'relative', // Needed for absolute positioning of tooltip
  },
  spacer: {
    height: 20, // Extra space between metrics and chart
  },
  chartContainer: {
    position: 'relative',
    // Height is now dynamic based on chartContainerHeight variable
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
  chartContentWrapper: {
    overflow: 'visible', // Allow tooltips to overflow
    zIndex: 1, // Ensure proper stacking
  },
  chartContent: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    paddingLeft: Y_AXIS_WIDTH, // Space for Y-axis labels
    height: 180, // Chart content area height only
    overflow: 'visible', // Allow tooltip to overflow
    zIndex: 1, // Ensure proper stacking context
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
    // paddingBottom removed
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end', // This ensures bars align with bottom (origin)
    height: '100%', 
    // No paddingBottom - important for proper alignment with grid lines
  },
  barWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    position: 'relative',
    overflow: 'visible', // Allow tooltip to overflow
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    position: 'absolute',
    bottom: 0,
    zIndex: 1, // Lower than tooltip
  },
  barGradient: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    opacity: 0.7,
  },
  xAxisLabelsWrapper: {
    height: 25,
    flexDirection: 'row',
    marginTop: 5, // Space between chart content and labels
  },
  xAxisLabelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  xAxisLabel: {
    color: 'rgba(94, 234, 212, 1)',
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  tooltip: {
    position: 'absolute',
    zIndex: 9999, // Extremely high z-index to ensure it's above everything
    // Remove fixed width
    // width: 80, // Fixed width for consistent look
    minWidth: DEFAULT_TOOLTIP_WIDTH, // Minimum width
    paddingHorizontal: 0, // No horizontal padding on the container
    elevation: 10, // Higher elevation for Android
    shadowColor: '#000', // Add shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    pointerEvents: 'box-none', // Allow touches to pass through to elements below
  },
  tooltipContent: {
    backgroundColor: '#115e59',
    borderRadius: 8,
    padding: 8, // Equal padding on all sides
    width: '100%',
    overflow: 'visible',
    zIndex: 9999, // Ensure the content also has high z-index
  },
  tooltipInnerContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    flexWrap: 'wrap', // Allow wrapping if needed
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
    zIndex: 9999, // Ensure arrow has high z-index too
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
    flexWrap: 'nowrap', // Prevent wrapping between value and unit
  },
  tooltipValue: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  tooltipUnit: {
    color: '#ffffff',
    fontSize: 10, // Smaller than the value
    fontFamily: 'Inter-Regular', // Less emphasis than the value
    marginLeft: 2,
  },
}); 