import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dumbbell, Scale, Timer, TrendingUp, Plus } from 'lucide-react-native';

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

export default function StatisticsScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Progress Tracking</Text>
        </View>

        <View style={styles.quickStats}>
          <View style={styles.quickStatCard}>
            <View style={styles.quickStatHeader}>
              <Dumbbell size={20} color="#14b8a6" />
              <Text style={styles.quickStatTitle}>Volume</Text>
            </View>
            <Text style={styles.quickStatValue}>12,450 kg</Text>
            <Text style={styles.quickStatChange}>+15% this month</Text>
          </View>
          <View style={styles.quickStatCard}>
            <View style={styles.quickStatHeader}>
              <Timer size={20} color="#14b8a6" />
              <Text style={styles.quickStatTitle}>Time</Text>
            </View>
            <Text style={styles.quickStatValue}>48.5 hrs</Text>
            <Text style={styles.quickStatChange}>+8% this month</Text>
          </View>
        </View>

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

        <View style={styles.widget}>
          <Text style={styles.widgetTitle}>Monthly Overview</Text>
          <View style={styles.monthlyStats}>
            <View style={styles.monthlyStat}>
              <Text style={styles.monthlyStatValue}>16</Text>
              <Text style={styles.monthlyStatLabel}>Workouts</Text>
            </View>
            <View style={styles.monthlyStat}>
              <Text style={styles.monthlyStatValue}>48</Text>
              <Text style={styles.monthlyStatLabel}>Hours</Text>
            </View>
            <View style={styles.monthlyStat}>
              <Text style={styles.monthlyStatValue}>156</Text>
              <Text style={styles.monthlyStatLabel}>Sets</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.addButton}>
          <Plus size={24} color="#021a19" />
          <Text style={styles.addButtonText}>Add Measurement</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
  },
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#0d3d56',
    borderRadius: 24,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  quickStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickStatTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    marginLeft: 8,
  },
  quickStatValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  quickStatChange: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#14b8a6',
  },
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
  monthlyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  monthlyStat: {
    alignItems: 'center',
  },
  monthlyStatValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#14b8a6',
  },
  monthlyStatLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14b8a6',
    borderRadius: 24,
    padding: 16,
    margin: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  addButtonText: {
    color: '#021a19',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
});