import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, LayoutChangeEvent } from 'react-native';
import { PieChart as RNPieChart } from 'react-native-chart-kit';
import { Svg, G, Path } from 'react-native-svg';
// Import with any type to avoid TypeScript errors
// @ts-ignore
import Pie from 'paths-js/pie';
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
  const [chartContainerWidth, setChartContainerWidth] = useState(0);
  const [chartWrapperWidth, setChartWrapperWidth] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  
  // Calculate effective chart width based on measured container size
  // Subtract additional space to ensure chart fits fully inside its container
  const effectiveChartWidth = chartWrapperWidth > 0 ? chartWrapperWidth * 0.9 : 140;

  // Format data for the chart with highlight color for selected segment
  const chartData = data.map((item, index) => ({
    name: item.name,
    population: item.value, 
    color: highlightedIndex === index ? '#FF90B3' : item.color, // Use pale pink for highlighting
    legendFontColor: '#5eead4',
    legendFontSize: 12,
    legendFontFamily: 'Inter-Regular',
  }));

  // Function to handle layout changes to measure container width
  const handleChartContainerLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setChartContainerWidth(width);
  };

  // Function to handle layout changes to measure chart wrapper width
  const handleChartWrapperLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setChartWrapperWidth(width);
  };

  // Function to handle legend item click
  const handleLegendItemClick = (index: number) => {
    setHighlightedIndex(highlightedIndex === index ? null : index);
  };

  // Function to handle pie segment click - use the same logic as legend click
  const handlePieSegmentPress = (index: number) => {
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
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {`${item.name}: ${item.value}`}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  };

  // Custom interactive pie chart component
  const renderInteractivePieChart = () => {
    if (chartWrapperWidth <= 0 || effectiveChartWidth <= 0) {
      return null;
    }

    // Calculate the pie segments using the same logic as the original component
    const chart = Pie({
      center: [0, 0], // Center point (will be translated by SVG)
      r: 0, // Inner radius (0 for a complete pie)
      R: effectiveChartWidth / 2.5, // Outer radius
      data: chartData.map(item => item), // Make a copy to avoid mutation
      accessor: (x: any) => x.population
    });

    return (
      <Svg
        width={effectiveChartWidth}
        height={effectiveChartWidth}
        style={{ backgroundColor: 'transparent' }}
      >
        <G x={effectiveChartWidth / 2} y={effectiveChartWidth / 2}>
          {/* Use type assertion to handle TypeScript error */}
          {(chart as any).curves.map((curve: any, index: number) => (
            <Path
              key={index}
              d={curve.sector.path.print()}
              fill={chartData[index].color}
              onPress={() => handlePieSegmentPress(index)}
            />
          ))}
        </G>
      </Svg>
    );
  };

  return (
    <ChartCard title={title} metrics={metrics}>
      <View style={styles.chartContainer} onLayout={handleChartContainerLayout}>
        <View style={styles.chartRow}>
          <View 
            style={styles.chartWrapper} 
            onLayout={handleChartWrapperLayout}
          >
            {renderInteractivePieChart()}
          </View>
          {renderCustomLegend()}
        </View>
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  chartWrapper: {
    width: '48%', 
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContainer: {
    width: '55%',
    marginLeft: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  legendItemHighlighted: {
    backgroundColor: 'rgba(255, 144, 179, 0.1)', // Light pink background for highlighted items
  },
  legendColorBox: {
    width: 12,
    height: 12,
    borderRadius: 4,
    marginRight: 8,
  },
  legendColorBoxHighlighted: {
    borderWidth: 1,
    borderColor: '#fff',
  },
  legendText: {
    color: '#5eead4',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  legendTextHighlighted: {
    fontFamily: 'Inter-SemiBold',
    color: '#FF90B3', // Pink color for highlighted text
  },
}); 