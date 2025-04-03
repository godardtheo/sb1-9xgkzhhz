import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
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
}

export default function BarChartCard({ 
  title, 
  metrics, 
  data, 
  period, 
  yAxisSuffix = '',
  yAxisLabel = '',
  color = '#14b8a6'
}: BarChartCardProps) {
  const { width } = useWindowDimensions();
  const chartWidth = width - 60; // Adjusted width for better centering

  // Format data based on selected time period
  const formattedData = formatDataForPeriod(data, period);

  // Chart data structure
  const chartData = {
    labels: formattedData.map(item => item.label),
    datasets: [
      {
        data: formattedData.map(item => item.value),
        color: () => '#14b8a6', // Solid color for bars with no opacity
      },
    ],
  };

  // Determine maximum value for Y-axis scale
  const maxValue = Math.max(...formattedData.map(item => item.value), 1);
  const yAxisMax = Math.ceil(maxValue * 1.2); // Add 20% headroom

  return (
    <ChartCard title={title} metrics={metrics}>
      <View style={styles.chartWrapper}>
        <BarChart
          data={chartData}
          width={chartWidth}
          height={220}
          yAxisLabel={yAxisLabel}
          yAxisSuffix={yAxisSuffix}
          chartConfig={{
            backgroundColor: '#0d3d56',
            backgroundGradientFrom: '#0d3d56',
            backgroundGradientTo: '#0d3d56',
            decimalPlaces: 0,
            color: () => '#14b8a6', // Solid color with no opacity
            labelColor: () => '#5eead4',
            barPercentage: 0.7,
            barRadius: 5,
            // Custom grid lines
            propsForBackgroundLines: {
              strokeDasharray: ['6', '6'], // Dotted lines for grid
              stroke: "rgba(94, 234, 212, 0.2)",
            },
            // Custom styling for labels
            propsForLabels: {
              fontSize: 11,
              fontFamily: 'Inter-Regular',
            },
            style: {
              borderRadius: 16,
            },
            // Make grid lines more visible
            strokeWidth: 1,
          }}
          withInnerLines={true}
          fromZero
          showValuesOnTopOfBars={false}
          showBarTops={true}
          segments={4}
          style={styles.chart}
          withHorizontalLabels={true}
          horizontalLabelRotation={0}
          verticalLabelRotation={0}
          flatColor={true}
        />
        
        {/* Custom axis lines and grid lines */}
        <View style={styles.xAxisLine} />
        <View style={styles.yAxisLine} />
        
        {/* Custom horizontal grid lines that start from y-axis */}
        {[0, 1, 2, 3, 4].map((i) => (
          <View 
            key={`hgrid-${i}`} 
            style={[
              styles.horizontalGridLine, 
              { bottom: 35 + i * (180 / 4) }
            ]} 
          />
        ))}
      </View>
    </ChartCard>
  );
}

// Helper function to format data based on time period
function formatDataForPeriod(data: BarChartDataPoint[], period: TimePeriod): FormattedDataPoint[] {
  // Sort data by date
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  switch (period) {
    case '7D':
    case '14D':
      // For shorter periods, show daily labels
      return sortedData.map(item => {
        const date = new Date(item.date);
        return {
          label: `${date.getDate()}/${date.getMonth() + 1}`,
          value: item.value
        };
      });
      
    case '1M':
      // For medium periods, show weekly intervals
      // Group by week and sum the values
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
      // For longer periods, show monthly intervals
      // Group by month and sum the values
      const monthlyData: {[key: string]: number} = {};
      sortedData.forEach(item => {
        const date = new Date(item.date);
        const monthLabel = date.toLocaleString('default', { month: 'short' });
        monthlyData[monthLabel] = (monthlyData[monthLabel] || 0) + item.value;
      });
      
      return Object.entries(monthlyData).map(([label, value]) => ({ label, value }));
  }
}

const styles = StyleSheet.create({
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    position: 'relative', // For absolute positioning of axis lines
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  xAxisLine: {
    position: 'absolute',
    left: 50, // Align with the left edge of chart area (after labels)
    bottom: 35, // Position at the bottom of the chart area
    right: 20,
    height: 1,
    backgroundColor: 'rgba(94, 234, 212, 0.8)', // Solid color for x-axis
    zIndex: 10,
  },
  yAxisLine: {
    position: 'absolute',
    left: 50, // Align with the left edge of chart area (after labels)
    bottom: 35, // Position at the bottom of the chart area
    width: 1,
    height: 180, // Height of the chart area
    backgroundColor: 'rgba(94, 234, 212, 0.8)', // Solid color for y-axis
    zIndex: 10,
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
}); 