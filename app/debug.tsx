import { BASE_URL } from '@/helpers/core-service';
import React, { useState } from 'react';
import { View, Text, Button, ScrollView, Alert } from 'react-native';

export default function DebugScreen() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testBackendConnection = async () => {
    try {
      addLog('Testing backend connection...');
      
      const response = await fetch(`${BASE_URL}/api`);
      const data = await response.json();
      
      addLog(`✅ Backend connected: ${data.message}`);
    } catch (error: any) {
      addLog(`❌ Backend connection failed: ${error.message}`);
    }
  };

  const testLoginEndpoint = async () => {
    try {
      const testData = {
        phone: "08123456789",
        password: "test123"
      };

      addLog('Testing login endpoint...');
      addLog(`Sending: ${JSON.stringify(testData)}`);
      
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(testData),
      });

      addLog(`Response status: ${response.status}`);
      
      const data = await response.json();
      addLog(`Response data: ${JSON.stringify(data)}`);
      
    } catch (error: any) {
      addLog(`❌ Login test failed: ${error.message}`);
    }
  };

  const testActualLogin = async () => {
    try {
      const formData = {
        phone: "08132325656", // Use a real test number
        password: "Simsdey"
      };

      addLog('Testing actual login flow...');
      
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        addLog('✅ LOGIN SUCCESSFUL!');
        addLog(`User: ${JSON.stringify(data.user)}`);
      } else {
        addLog(`❌ Login failed: ${data.message}`);
      }
      
    } catch (error: any) {
      addLog(`💥 Network error: ${error.message}`);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>API Debugger</Text>
      
      <Button title="Test Backend Connection" onPress={testBackendConnection} />
      <Button title="Test Login Endpoint" onPress={testLoginEndpoint} />
      <Button title="Test Actual Login" onPress={testActualLogin} />
      
      <ScrollView style={{ marginTop: 20, backgroundColor: '#f5f5f5', padding: 10, maxHeight: 400 }}>
        {logs.map((log, index) => (
          <Text key={index} style={{ 
            fontSize: 12, 
            marginBottom: 5,
            color: log.includes('❌') || log.includes('💥') ? 'red' : 'green'
          }}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}