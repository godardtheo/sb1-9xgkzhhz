import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';

type PieChartProps = {
  data: Array<{
    x: string;
    y: number;
    color?: string;
  }>;
  title?: string;
  width?: number;
  height?: number;
  colorScale?: string[];
  innerRadius?: number;
  labels?: boolean;
  legend?: boolean;
};

export default function PieChart({
  data,
  title,
  width = 350,
  height = 300,
  colorScale = ['#14b8a6', '#0ea5e9', '#8b5cf6', '#f43f5e', '#f97316'],
  innerRadius = 0,
  labels = true,
  legend = true,
}: PieChartProps) {
  
  // Default color assignment if not provided in data
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: item.color || colorScale[index % colorScale.length],
  }));
  
  // Calculate total for percentages
  const total = dataWithColors.reduce((sum, item) => sum + item.y, 0);
  
  // Calculate pie slices
  const slices = dataWithColors.map((item, index) => {
    const percentage = item.y / total;
    return {
      ...item,
      percentage,
      startAngle: index === 0 ? 0 : dataWithColors.slice(0, index).reduce((sum, d) => sum + (d.y / total) * 2 * Math.PI, 0),
      endAngle: dataWithColors.slice(0, index + 1).reduce((sum, d) => sum + (d.y / total) * 2 * Math.PI, 0),
    };
  });
  
  // Draw pie slices as SVG paths
  const createPieSlice = (slice: any) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20; // Leave some margin
    
    // Calculate points
    const startX = centerX + Math.cos(slice.startAngle - Math.PI / 2) * radius;
    const startY = centerY + Math.sin(slice.startAngle - Math.PI / 2) * radius;
    const endX = centerX + Math.cos(slice.endAngle - Math.PI / 2) * radius;
    const endY = centerY + Math.sin(slice.endAngle - Math.PI / 2) * radius;
    
    // Calculate inner points if there's an inner radius
    let innerRadiusValue = radius * (innerRadius / 100);
    if (innerRadiusValue <= 0) innerRadiusValue = 0;
    
    const innerStartX = centerX + Math.cos(slice.startAngle - Math.PI / 2) * innerRadiusValue;
    const innerStartY = centerY + Math.sin(slice.startAngle - Math.PI / 2) * innerRadiusValue;
    const innerEndX = centerX + Math.cos(slice.endAngle - Math.PI / 2) * innerRadiusValue;
    const innerEndY = centerY + Math.sin(slice.endAngle - Math.PI / 2) * innerRadiusValue;
    
    // Create SVG path
    const largeArcFlag = slice.percentage > 0.5 ? 1 : 0;
    
    // If inner radius is 0, draw a simple pie slice
    if (innerRadiusValue === 0) {
      return `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    }
    
    // Otherwise draw a donut slice
    return `
      M ${innerStartX} ${innerStartY}
      L ${startX} ${startY} 
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
      L ${innerEndX} ${innerEndY}
      A ${innerRadiusValue} ${innerRadiusValue} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}
      Z
    `;
  };
  
  // Calculate position for labels
  const getLabelPosition = (slice: any) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    const labelRadius = radius * 0.7; // Position labels at 70% of the radius
    
    // Calculate the middle angle of the slice
    const midAngle = (slice.startAngle + slice.endAngle) / 2;
    
    return {
      x: centerX + Math.cos(midAngle - Math.PI / 2) * labelRadius,
      y: centerY + Math.sin(midAngle - Math.PI / 2) * labelRadius,
    };
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.chartContainer}>
        <Svg width={width} height={height}>
          <G>
            {slices.map((slice, index) => (
              <Path
                key={`slice-${index}`}
                d={createPieSlice(slice)}
                fill={slice.color}
                stroke="#0d3d56"
                strokeWidth={1}
              />
            ))}
            
            {labels && slices.map((slice, index) => {
              const { x, y } = getLabelPosition(slice);
              // Only show label if the slice is big enough
              if (slice.percentage < 0.05) return null;
              
              return (
                <SvgText
                  key={`label-${index}`}
                  x={x}
                  y={y}
                  fill="#ccfbf1"
                  fontSize={12}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {`${slice.x}: ${slice.y}`}
                </SvgText>
              );
            })}
          </G>
        </Svg>
        
        {legend && (
          <View style={styles.legendContainer}>
            {dataWithColors.map((item, index) => (
              <View key={`legend-${index}`} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{`${item.x}: ${item.y}`}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ccfbf1',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
  },
  legendContainer: {
    marginTop: 20,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    color: '#ccfbf1',
    fontSize: 12,
  },
}); 