import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform } from 'react-native';

export default function TestScrollScreen() {
  // Generate 20 dummy items
  const dummyItems = Array.from({ length: 20 }, (_, i) => ({
    id: `item-${i}`,
    title: `Test Item ${i}`
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Test Scroll Screen</Text>
        </View>
        
        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={true}
        >
          {dummyItems.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemText}>{item.title}</Text>
              <Text style={styles.itemSubtext}>This is a test item with some content to make it taller</Text>
              <Text style={styles.itemSubtext}>Another line of text for height</Text>
              <Text style={styles.itemSubtext}>One more line to ensure scrolling</Text>
            </View>
          ))}
        </ScrollView>
        
        {/* Fixed Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Fixed Footer</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#115e59',
    borderBottomWidth: 1,
    borderBottomColor: '#0d9488',
  },
  headerText: {
    fontSize: 20,
    color: '#ccfbf1',
    fontFamily: 'Inter-Bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Make room for footer
  },
  itemCard: {
    backgroundColor: '#115e59',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  itemText: {
    fontSize: 18,
    color: '#ccfbf1',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  itemSubtext: {
    fontSize: 14,
    color: '#5eead4',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#115e59',
    borderTopWidth: 1,
    borderTopColor: '#0d9488',
  },
  footerText: {
    fontSize: 16,
    color: '#ccfbf1',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});