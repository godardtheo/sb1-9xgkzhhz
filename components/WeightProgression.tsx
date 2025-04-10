import { View, Text, StyleSheet, Platform } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Scale, TrendingUp } from 'lucide-react-native';

function WeightChart() {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webChartPlaceholder}>
        <Scale size={32} color="#14b8a6" />
        <Text style={styles.webChartText}>Weight Progress</Text>
        <Text style={styles.webChartSubtext}>Chart visualization available on mobile devices</Text>
      </View>
    );
  }

  return (
    <LineChart
      data={{
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{ data: [75, 76, 77, 76.5, 77.5] }],
      }}
      width={350}
      height={200}
      chartConfig={{
        backgroundColor: '#0d3d56',
        backgroundGradientFrom: '#0d3d56',
        backgroundGradientTo: '#0d3d56',
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`,
        labelColor: () => '#5eead4',
        style: {
          borderRadius: 24,
        },
        propsForDots: {
          r: '6',
          strokeWidth: '2',
          stroke: '#14b8a6',
        },
      }}
      bezier
      style={styles.chart}
    />
  );
}

export default function WeightProgression() {
  return (
    <View style={styles.widget}>
      <View style={styles.widgetHeader}>
        <Text style={styles.widgetTitle}>Weight Progression</Text>
        <TrendingUp size={20} color="#14b8a6" />
      </View>
      <WeightChart />
      <View style={styles.weightStats}>
        <View style={styles.weightStat}>
          <Text style={styles.weightStatLabel}>Starting</Text>
          <Text style={styles.weightStatValue}>75 kg</Text>
        </View>
        <View style={styles.weightStat}>
          <Text style={styles.weightStatLabel}>Current</Text>
          <Text style={styles.weightStatValue}>77.5 kg</Text>
        </View>
        <View style={styles.weightStat}>
          <Text style={styles.weightStatLabel}>Goal</Text>
          <Text style={styles.weightStatValue}>80 kg</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  widget: {
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
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  widgetTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 24,
  },
  webChartPlaceholder: {
    height: 200,
    backgroundColor: '#0f766e',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  webChartText: {
    color: '#ccfbf1',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
  },
  webChartSubtext: {
    color: '#5eead4',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 8,
  },
  weightStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#0f766e',
  },
  weightStat: {
    alignItems: 'center',
  },
  weightStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    marginBottom: 4,
  },
  weightStatValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
}); 