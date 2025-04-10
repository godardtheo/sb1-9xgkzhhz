import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface Metric {
  label: string;
  value: string | React.ReactNode;
}

export interface ChartCardProps {
  title: string;
  metrics: Metric[];
  children?: React.ReactNode;
}

export default function ChartCard({ title, metrics, children }: ChartCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.metricsContainer}>
        {metrics.map((metric, index) => (
          <View 
            key={metric.label} 
            style={[
              styles.metric,
              index < metrics.length - 1 && styles.metricWithBorder
            ]}
          >
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.chartContainer}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d3d56',
    borderRadius: 24,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricWithBorder: {
    borderRightWidth: 1,
    borderRightColor: '#0f766e',
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  chartContainer: {
    minHeight: 200,
  },
}); 