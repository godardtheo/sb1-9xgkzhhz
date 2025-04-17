import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Scale, TrendingUp } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { getWeightHistory } from '@/lib/weightUtils';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

function WeightChart() {
  const [weightData, setWeightData] = useState<Array<{ date: string; weight: number }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchWeightData = async () => {
    try {
      setLoading(true);
      const data = await getWeightHistory(90); // Get 90 days of history
      setWeightData(data);
    } catch (error) {
      console.error('Error fetching weight data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWeightData();
    }, [])
  );

  useEffect(() => {
    fetchWeightData();
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webChartPlaceholder}>
        <Scale size={32} color="#14b8a6" />
        <Text style={styles.webChartText}>Weight Progress</Text>
        <Text style={styles.webChartSubtext}>Chart visualization available on mobile devices</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.webChartPlaceholder, { backgroundColor: '#0d3d56' }]}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.webChartSubtext}>Loading weight data...</Text>
      </View>
    );
  }

  if (weightData.length < 2) {
    return (
      <View style={[styles.webChartPlaceholder, { backgroundColor: '#0d3d56' }]}>
        <Scale size={32} color="#14b8a6" />
        <Text style={styles.webChartText}>Not enough data</Text>
        <Text style={styles.webChartSubtext}>Log your weight to see a chart</Text>
      </View>
    );
  }

  // Format data for the chart
  const labels = weightData.slice(-5).map(entry => {
    const date = new Date(entry.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  
  const weights = weightData.slice(-5).map(entry => entry.weight);

  return (
    <LineChart
      data={{
        labels: labels,
        datasets: [{ data: weights }],
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
  const [weightStats, setWeightStats] = useState({
    initial: null,
    current: null,
    target: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchWeightGoals = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get initial weight from users table
      const { data, error } = await supabase
        .from('users')
        .select('initial_weight')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching initial weight:', error);
        return;
      }

      // Get target weight from user_goals table
      const { data: goalData, error: goalError } = await supabase
        .from('user_goals')
        .select('weight')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (goalError && goalError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        console.error('Error fetching goal weight:', goalError);
      }

      // Get latest weight for current
      const { data: weightData, error: weightError } = await supabase
        .from('weight_logs')
        .select('weight')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1);

      if (weightError) {
        console.error('Error fetching current weight:', weightError);
      }

      setWeightStats({
        initial: data.initial_weight,
        target: goalData?.weight || null,
        current: weightData && weightData.length > 0 ? weightData[0].weight : null,
      });
    } catch (error) {
      console.error('Error in fetchWeightGoals:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWeightGoals();
    }, [])
  );

  useEffect(() => {
    fetchWeightGoals();
  }, []);

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
          {loading ? (
            <ActivityIndicator size="small" color="#14b8a6" />
          ) : (
            <Text style={styles.weightStatValue}>
              {weightStats.initial ? `${weightStats.initial} kg` : 'N/A'}
            </Text>
          )}
        </View>
        <View style={styles.weightStat}>
          <Text style={styles.weightStatLabel}>Current</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#14b8a6" />
          ) : (
            <Text style={styles.weightStatValue}>
              {weightStats.current ? `${weightStats.current} kg` : 'N/A'}
            </Text>
          )}
        </View>
        <View style={styles.weightStat}>
          <Text style={styles.weightStatLabel}>Goal</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#14b8a6" />
          ) : (
            <Text style={styles.weightStatValue}>
              {weightStats.target ? `${weightStats.target} kg` : 'N/A'}
            </Text>
          )}
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