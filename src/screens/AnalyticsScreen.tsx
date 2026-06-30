import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';

import { dbHelper } from '../db/database';
import { TransactionModel } from '../models/Transaction';
import { MIDNIGHT, GOLD, SLATE, SLATE_100, SLATE_200, PRIMARIES } from '../theme';

const FILTERS = ['This Month', 'Last 3 Months', 'All Time'];

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  format(new Date(2023, i, 1), 'MMM')
);

const BAR_COLOR = '#6366F1';

export default function AnalyticsScreen() {
  const [selectedFilter, setSelectedFilter] = useState('This Month');
  const [transactions, setTransactions] = useState<TransactionModel[]>([]);
  const [spendingCategories, setSpendingCategories] = useState<Record<string, number>>({});
  const [totalCashback, setTotalCashback] = useState(0);
  const [cappedCashback, setCappedCashback] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactions = useCallback(async (filter: string) => {
    setIsLoading(true);
    const all = await dbHelper.getAllTransactions();
    const now = new Date();
    let startDate: Date | null = null;

    if (filter === 'This Month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filter === 'Last 3 Months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    }

    const filtered = startDate
      ? all.filter((txn) => txn.date.getTime() >= startDate!.getTime())
      : all;

    const categoryData: Record<string, number> = {};
    let totalSpent = 0;
    let capped = 0;
    const monthlyCashback: Record<string, number> = {};

    for (const txn of filtered) {
      totalSpent += txn.amount;
      const key = `${txn.date.getFullYear()}-${txn.date.getMonth() + 1}`;
      monthlyCashback[key] = (monthlyCashback[key] ?? 0) + txn.cashback;
      categoryData[txn.category] = (categoryData[txn.category] ?? 0) + txn.amount;
    }

    // Cap at ₹400 per calendar month before summing.
    for (const monthly of Object.values(monthlyCashback)) {
      capped += monthly > 400 ? 400 : monthly;
    }

    setTransactions(filtered);
    setSpendingCategories(categoryData);
    setTotalCashback(totalSpent);
    setCappedCashback(capped);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTransactions(selectedFilter);
    }, [loadTransactions, selectedFilter])
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = f === selectedFilter;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => {
                setSelectedFilter(f);
                loadTransactions(f);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={styles.statLabel}>TOTAL SPENT</Text>
          <Text style={styles.statAmount}>₹{totalCashback.toFixed(2)}</Text>
        </View>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={styles.statLabel}>CASHBACK EARNED</Text>
          <Text style={[styles.statAmount, { color: GOLD }]}>₹{cappedCashback.toFixed(2)}</Text>
        </View>
      </View>

      {/* Spending by category */}
      <Text style={styles.sectionTitle}>Spending by category</Text>
      <SpendingChart isLoading={isLoading} data={spendingCategories} />

      {/* Cashback bar chart */}
      <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Monthly cashback</Text>
      <CashbackProgressChart isLoading={isLoading} transactions={transactions} />
    </ScrollView>
  );
}

function SpendingChart({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: Record<string, number>;
}) {
  if (isLoading) {
    return (
      <View style={styles.chartBox}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <View style={styles.chartBox}>
        <Text style={styles.emptyText}>No spending data yet</Text>
      </View>
    );
  }

  const pieData = entries.map(([category, amount], i) => ({
    value: amount,
    color: PRIMARIES[i % PRIMARIES.length],
    label: category,
  }));

  return (
    <View style={{ alignItems: 'center', marginTop: 16 }}>
      <PieChart
        data={pieData}
        donut
        radius={90}
        innerRadius={54}
        innerCircleColor="#fff"
        centerLabelComponent={() => (
          <Text style={{ fontSize: 11, color: SLATE, fontWeight: '600' }}>SPENT</Text>
        )}
      />
      <View style={styles.legend}>
        {pieData.map((slice) => (
          <View key={slice.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
            <Text style={styles.legendLabel}>{slice.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CashbackProgressChart({
  isLoading,
  transactions,
}: {
  isLoading: boolean;
  transactions: TransactionModel[];
}) {
  if (isLoading) {
    return (
      <View style={styles.chartBox}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }
  if (transactions.length === 0) {
    return (
      <View style={styles.chartBox}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const cashbackByMonth = Array.from({ length: 12 }, (_, monthIndex) =>
    Math.min(
      400,
      transactions
        .filter((txn) => txn.date.getMonth() === monthIndex)
        .reduce((sum, txn) => sum + txn.cashback, 0)
    )
  );

  const barData = cashbackByMonth.map((value, i) => ({
    value,
    label: MONTH_NAMES[i],
    frontColor: BAR_COLOR,
  }));

  return (
    <View style={styles.barChartWrap}>
      <BarChart
        data={barData}
        barWidth={14}
        spacing={14}
        roundedTop
        frontColor={BAR_COLOR}
        yAxisLabelPrefix="₹"
        maxValue={400}
        noOfSections={4}
        stepValue={100}
        xAxisLabelTextStyle={{ fontSize: 10, color: SLATE }}
        yAxisTextStyle={{ fontSize: 10, color: SLATE }}
        yAxisColor={SLATE_200}
        xAxisColor={SLATE_200}
        rulesColor={SLATE_100}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 48 },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: SLATE_200,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: MIDNIGHT,
    borderColor: MIDNIGHT,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SLATE,
  },
  filterLabelActive: {
    color: '#fff',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    backgroundColor: SLATE_100,
    borderRadius: 14,
    padding: 16,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: SLATE,
    marginBottom: 6,
  },
  statAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: MIDNIGHT,
    letterSpacing: -0.3,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: MIDNIGHT,
    marginTop: 24,
    marginBottom: 4,
  },

  chartBox: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: SLATE,
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendLabel: {
    fontSize: 13,
    color: MIDNIGHT,
    fontWeight: '500',
  },

  barChartWrap: {
    marginTop: 12,
  },
});
