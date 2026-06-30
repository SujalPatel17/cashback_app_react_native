import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { RootStackParamList, TabParamList } from './src/navigation/types';
import { notificationService } from './src/services/notifications';

import HomeScreen from './src/screens/HomeScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import PendingCheckScreen from './src/screens/PendingCheckScreen';
import TransactionHistoryScreen from './src/screens/TransactionHistoryScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// colorSchemeSeed: Colors.teal
const TEAL = '#009688';

const AppTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: TEAL },
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: TEAL },
        headerTintColor: '#fff',
        // Matches the Dart BottomNavigationBar styling.
        tabBarStyle: { backgroundColor: '#000' },
        tabBarActiveTintColor: '#2196F3', // blue when selected
        tabBarInactiveTintColor: '#fff', // white icons
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
            Home: 'home',
            Analytics: 'stats-chart',
            PendingChecks: 'checkmark-circle-outline',
            Transactions: 'time',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen
        name="PendingChecks"
        component={PendingCheckScreen}
        options={{ title: 'Pending Checks' }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionHistoryScreen}
        options={{ title: 'Transactions' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    // Initialise timezone/notifications, like main() in main.dart.
    notificationService.init();
  }, []);

  return (
    <NavigationContainer theme={AppTheme}>
      <StatusBar style="light" />
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="AddTransaction"
          component={AddTransactionScreen}
          options={{
            title: 'Add Transaction',
            headerStyle: { backgroundColor: TEAL },
            headerTintColor: '#fff',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
