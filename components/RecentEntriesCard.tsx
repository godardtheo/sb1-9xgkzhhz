import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WeightData {
  date: string;
  weight: number;
  notes?: string;
}

interface RecentEntriesCardProps {
  isLoading: boolean;
  weightData: WeightData[];
  onEntryPress: (entry: WeightData) => void;
}

const RecentEntriesCard: React.FC<RecentEntriesCardProps> = ({ 
  isLoading, 
  weightData, 
  onEntryPress 
}) => {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get year from date string
  const getYear = (dateString: string) => {
    return new Date(dateString).getFullYear();
  };

  // Get trend icon and color based on weight change
  const getTrendIndicator = (currentWeight: number, index: number, data: WeightData[]) => {
    if (index === data.length - 1) {
      // First entry (when displayed in reverse), no previous weight to compare
      return { 
        icon: 'remove-outline' as const, 
        color: '#6B7280',
      };
    }

    const previousWeight = data[index + 1].weight;
    
    if (currentWeight > previousWeight) {
      return { 
        icon: 'caret-up' as const, 
        color: '#ff90b3', // Pink for weight increase
      };
    } else if (currentWeight < previousWeight) {
      return {
        icon: 'caret-down' as const,
        color: '#14b8a6', // Teal for weight decrease
      };
    } else {
      return {
        icon: 'remove-outline' as const,
        color: '#6B7280', // Gray for no change
      };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Recent Entries</Text>
        <Text style={styles.loadingText}>Loading entries...</Text>
      </View>
    );
  }

  const reversedData = weightData.slice().reverse();
  
  // Group entries by year
  const entriesByYear = reversedData.reduce((acc, entry) => {
    const year = getYear(entry.date);
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(entry);
    return acc;
  }, {} as Record<string, WeightData[]>);
  
  // Sort years in descending order
  const sortedYears = Object.keys(entriesByYear).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Entries</Text>
      
      {weightData.length > 0 ? (
        sortedYears.map(year => (
          <View key={year}>
            {/* Year header */}
            <View style={styles.yearHeader}>
              <Text style={styles.yearText}>{year}</Text>
            </View>
            
            {/* Entries for this year */}
            {entriesByYear[year].map((entry, index) => {
              const trend = getTrendIndicator(
                entry.weight, 
                entriesByYear[year].indexOf(entry), 
                entriesByYear[year]
              );
              
              // Check if this is the last entry in this year group
              const isLastInYear = index === entriesByYear[year].length - 1;
              
              return (
                <TouchableOpacity 
                  key={`${year}-${index}`}
                  style={[
                    styles.entryItem,
                    // Only apply bottom border if not the last entry in the year
                    isLastInYear ? styles.entryItemWithoutBorder : null
                  ]}
                  onPress={() => onEntryPress(entry)}
                >
                  <View style={styles.entryRow}>
                    <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                    <View style={styles.weightContainer}>
                      <Text style={styles.entryWeight}>{entry.weight.toFixed(1)} kg</Text>
                      <Ionicons 
                        name={trend.icon} 
                        size={18} 
                        color={trend.color} 
                        style={styles.trendIcon} 
                      />
                    </View>
                  </View>
                  
                  {entry.notes ? (
                    <Text style={styles.entryNotes} numberOfLines={2}>{entry.notes}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))
      ) : (
        <Text style={styles.noDataText}>No entries available</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#042f2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5eead4',
    marginBottom: 15,
  },
  yearHeader: {
    backgroundColor: '#031917',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: -16,
    marginRight: -16,
    paddingLeft: 24, // 8px original + 16px to compensate for negative margin
    marginTop: 4,
    marginBottom: 4,
  },
  yearText: {
    color: '#99f6e4',
    fontSize: 13,
    opacity: 0.8,
  },
  entryItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(94, 234, 212, 0.1)',
  },
  entryItemWithoutBorder: {
    borderBottomWidth: 0,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  entryDate: {
    color: '#99f6e4',
    fontSize: 18,
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryWeight: {
    color: '#ccfbf1',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  trendIcon: {
    width: 24,
    textAlign: 'center',
  },
  entryNotes: {
    color: '#99f6e4',
    fontSize: 13,
    marginTop: 2,
    opacity: 0.8,
  },
  loadingText: {
    textAlign: 'center',
    padding: 30,
    color: '#99f6e4',
  },
  noDataText: {
    textAlign: 'center',
    padding: 30,
    color: '#99f6e4',
  },
});

export default RecentEntriesCard; 