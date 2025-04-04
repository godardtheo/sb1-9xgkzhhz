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
  data = [],
  period, 
  yAxisSuffix = '',
  yAxisLabel = '',
  color = '#14b8a6'
}: BarChartCardProps) {
  const { width } = useWindowDimensions();
  const chartWidth = width - 30; // Make chart wider to fill more space

  // Format data based on selected time period
  const formattedData = formatDataForPeriod(data || [], period);
  
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

  // Determine maximum value for Y-axis scale
  const maxValue = Math.max(...formattedData.map(item => item.value), 1);
  const yAxisMax = Math.ceil(maxValue * 1.2); // Add 20% headroom

  return (
    <ChartCard title={title} metrics={metrics}>
      <View style={styles.chartWrapper}>
        {/* Negative left margin container to shift chart left */}
        <View style={styles.chartShiftContainer}>
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
              color: () => color,
              fillShadowGradient: color,
              fillShadowGradientOpacity: 1,
              labelColor: () => '#5eead4',
              barPercentage: 0.7,
              barRadius: 5,
              propsForBackgroundLines: {
                strokeDasharray: ['6', '6'],
                stroke: "rgba(94, 234, 212, 0.2)",
              },
              propsForLabels: {
                fontSize: 10,
                fontFamily: 'Inter-Regular',
              },
              style: {
                borderRadius: 16,
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
            horizontalLabelRotation={0}
            verticalLabelRotation={0}
          />
        </View>
      </View>
    </ChartCard>
  );
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
      
    default:
      return sortedData.map(item => {
        const date = new Date(item.date);
        return {
          label: `${date.getDate()}/${date.getMonth() + 1}`,
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
    position: 'relative', // For absolute positioning of axis lines
    overflow: 'hidden', // Prevent overflow when shifting chart
  },
  chartShiftContainer: {
    marginLeft: -20, // Shift entire chart to the left
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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