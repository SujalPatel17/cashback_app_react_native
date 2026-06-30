import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { dbHelper } from '../db/database';
import { notificationService } from '../services/notifications';
import { formatCurrency } from '../utils/format';
import { RootStackParamList } from '../navigation/types';
import {
  MIDNIGHT,
  GOLD,
  EMERALD,
  FROST,
  SLATE,
} from '../theme';

const MAX_CASHBACK = 400.0;

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [totalSpent, setTotalSpent] = useState(0);
  const [totalCashback, setTotalCashback] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [trackWidth, setTrackWidth] = useState(0);

  const checkAndRequestPermission = useCallback(async () => {
    const requested = await AsyncStorage.getItem('isPermissionRequested');
    if (requested !== 'true') {
      const granted = await notificationService.requestPermission();
      if (granted) {
        await AsyncStorage.setItem('isPermissionRequested', 'true');
      }
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    const transactions = await dbHelper.getAllTransactions();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
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

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      checkAndRequestPermission();
    }, [loadDashboardData, checkAndRequestPermission])
  );

  const progress = Math.min(1, totalCashback / MAX_CASHBACK);
  const remaining = Math.max(0, MAX_CASHBACK - totalCashback);
  const now = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={loadDashboardData}
            tintColor={GOLD}
          />
        }
      >
        {/* Hero section */}
        <View style={styles.hero}>
          <Text style={styles.heroMonth}>{monthLabel}</Text>
          <Text style={styles.heroLabel}>CASHBACK EARNED</Text>
          <Text style={styles.heroAmount}>{formatCurrency(totalCashback)}</Text>

          {/* Cap progress bar */}
          <View
            style={styles.progressTrack}
            onLayout={(e: LayoutChangeEvent) =>
              setTrackWidth(e.nativeEvent.layout.width)
            }
          >
            <View
              style={[
                styles.progressFill,
                { width: trackWidth * progress },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>
              ₹{totalCashback.toFixed(0)} earned
            </Text>
            <Text style={styles.progressText}>₹{MAX_CASHBACK} cap</Text>
          </View>
        </View>

        {/* Stat cards */}
        <View style={styles.cardsRow}>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardLabel}>SPENT</Text>
            <Text style={styles.cardAmount}>{formatCurrency(totalSpent)}</Text>
            <Text style={styles.cardSub}>this month</Text>
          </View>

          <View style={[styles.card, styles.cardHalf, styles.cardHighlight]}>
            <Text style={[styles.cardLabel, { color: EMERALD }]}>REMAINING</Text>
            <Text style={[styles.cardAmount, { color: EMERALD }]}>
              {formatCurrency(remaining)}
            </Text>
            <Text style={styles.cardSub}>cap left</Text>
          </View>
        </View>

        {/* Progress indicator text */}
        <View style={styles.capsuleRow}>
          <View
            style={[
              styles.capsule,
              progress >= 1
                ? { backgroundColor: '#FEF2F2' }
                : { backgroundColor: FROST },
            ]}
          >
            <Ionicons
              name={progress >= 1 ? 'lock-closed' : 'trending-up'}
              size={14}
              color={progress >= 1 ? '#EF4444' : GOLD}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.capsuleText,
                { color: progress >= 1 ? '#EF4444' : SLATE },
              ]}
            >
              {progress >= 1
                ? 'Monthly cap reached'
                : `${Math.round(progress * 100)}% of ₹400 cap used`}
            </Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTransaction')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color={MIDNIGHT} />
        <Text style={styles.fabLabel}>Add Transaction</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FROST },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: FROST,
  },
  scroll: { paddingBottom: 100 },

  hero: {
    backgroundColor: MIDNIGHT,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
  },
  heroMonth: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: GOLD,
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 44,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 24,
  },

  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: GOLD,
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },

  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHalf: { flex: 1 },
  cardHighlight: {
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: SLATE,
    marginBottom: 6,
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: MIDNIGHT,
    letterSpacing: -0.5,
  },
  cardSub: {
    fontSize: 12,
    color: SLATE,
    marginTop: 2,
  },

  capsuleRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  capsuleText: {
    fontSize: 13,
    fontWeight: '500',
  },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GOLD,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 32,
    shadowColor: GOLD,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabLabel: {
    color: MIDNIGHT,
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
