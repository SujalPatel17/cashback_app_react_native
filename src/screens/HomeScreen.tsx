// Ported from lib/screens/home_screen.dart
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { dbHelper } from '../db/database';
import { notificationService } from '../services/notifications';
import { formatCurrency, rupees } from '../utils/format';
import { RootStackParamList } from '../navigation/types';
import { TEAL, GREEN } from '../theme';

const MAX_CASHBACK = 400.0;

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [totalSpent, setTotalSpent] = useState(0);
  const [totalCashback, setTotalCashback] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const checkAndRequestPermission = useCallback(async () => {
    const requested = await AsyncStorage.getItem('isPermissionRequested');
    if (requested !== 'true') {
      const granted = await notificationService.requestPermission();
      if (granted) {
        await AsyncStorage.setItem('isPermissionRequested', 'true');
      } else {
        console.log('Permission not granted');
      }
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    const transactions = await dbHelper.getAllTransactions();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    // include the whole last day, matching the Dart `add(Duration(days: 1))`.
    const monthEndExclusive = new Date(monthEnd);
    monthEndExclusive.setDate(monthEndExclusive.getDate() + 1);

    let spent = 0;
    let cashback = 0;
    for (const txn of transactions) {
      if (txn.date > monthStart && txn.date < monthEndExclusive) {
        spent += txn.amount;
        cashback += txn.cashback;
      }
    }
    setTotalSpent(spent);
    setTotalCashback(cashback);
    setIsLoading(false);
  }, []);

  // Reload every time the tab gains focus (covers "refresh after add").
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      checkAndRequestPermission();
    }, [loadDashboardData, checkAndRequestPermission])
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={loadDashboardData} />
        }
      >
        <Card>
          <Text style={styles.cardTitle}>Total Spending (This Month)</Text>
          <Text style={styles.cardSubtitle}>{formatCurrency(totalSpent)}</Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Total Cashback Earned</Text>
          <Text style={styles.cardSubtitle}>{formatCurrency(totalCashback)}</Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Cashback Status (₹400 Cap)</Text>
          <Text style={styles.cardSubtitle}>
            Cashback Earned: {rupees(totalCashback)}
          </Text>
          <Text style={styles.cardSubtitle}>
            Remaining Cashback: {rupees(MAX_CASHBACK - totalCashback)}
          </Text>
        </Card>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTransaction')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.fabLabel}>Add Transaction</Text>
      </TouchableOpacity>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 96 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#555', marginTop: 2 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 4,
  },
  fabLabel: { color: '#fff', fontWeight: '600', marginLeft: 8 },
});
