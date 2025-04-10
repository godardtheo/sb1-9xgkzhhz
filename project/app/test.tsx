import React from 'react';
import { View, Text, Button } from 'react-native';
import uuid from 'react-native-uuid';

export default function TestUUID() {
  const generateUUID = () => {
    const id = uuid.v4();
    console.log('Generated UUID:', id);
    alert(`Generated UUID: ${id}`);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ marginBottom: 20, fontSize: 18 }}>UUID Generator Test</Text>
      <Button title="Generate UUID" onPress={generateUUID} />
    </View>
  );
} 