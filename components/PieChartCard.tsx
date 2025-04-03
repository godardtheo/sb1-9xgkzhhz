import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import ChartCard, { ChartCardProps } from './ChartCard';

export interface DataPoint {
  name: string;
  value: number;
  color: string;
}

interface PieChartCardProps extends Omit<ChartCardProps, 'children'> {
  data: DataPoint[];
}

export default function PieChartCard({ title, metrics, data }: PieChartCardProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(180, width - 220); // Ensure chart fits in container with legend
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Format data for the chart with highlight color for selected segment
  const chartData = data.map((item, index) => ({
    name: item.name,
    population: item.value, 
    color: highlightedIndex === index ? '#FF90B3' : item.color, // Use pale pink for highlighting
    legendFontColor: '#5eead4',
    legendFontSize: 12,
    legendFontFamily: 'Inter-Regular',
  }));

  // Function to handle legend item click
  const handleLegendItemClick = (index: number) => {
    setHighlightedIndex(highlightedIndex === index ? null : index);
  };

  // Custom legend component
  const renderCustomLegend = () => {
    return (
      <View style={styles.legendContainer}>
        {data.map((item, index) => (
          <Pressable 
            key={item.name} 
            style={[
              styles.legendItem,
              highlightedIndex === index && styles.legendItemHighlighted
            ]}
            onPress={() => handleLegendItemClick(index)}
          >
            <View 
              style={[
                styles.legendColorBox, 
                { backgroundColor: highlightedIndex === index ? '#FF90B3' : item.color },
                highlightedIndex === index && styles.legendColorBoxHighlighted
              ]} 
            />
            <Text 
              style={[
                styles.legendText,
                highlightedIndex === index && styles.legendTextHighlighted
              ]}
            >
              {`${item.name}: ${item.value}`}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <ChartCard title={title} metrics={metrics}>
      <View style={styles.chartContainer}>
        <View style={styles.chartWrapper}>
          <PieChart
            data={chartData}
            width={chartWidth}
            height={160}
            chartConfig={{
              color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`,
              labelColor: () => '#5eead4',
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            hasLegend={false}
          />
        </View>
        {renderCustomLegend()}
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0, // Remove horizontal padding to allow chart to be positioned correctly
  },
  chartWrapper: {
    width: 180,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 20, // Add padding to shift the chart to the right
    overflow: 'visible', // Allow chart to be visible even if it slightly overflows
  },
  legendContainer: {
    flex: 1,
    paddingLeft: 16,
    marginLeft: -10, // Adjust legend position
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  legendItemHighlighted: {
    backgroundColor: '#115e59',
  },
  legendColorBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  legendColorBoxHighlighted: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#fff',
  },
  legendText: {
    color: '#5eead4',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  legendTextHighlighted: {
    color: '#ffffff',
    fontFamily: 'Inter-Medium',
  },
}); 