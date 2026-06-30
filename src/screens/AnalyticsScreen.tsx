// Ported from lib/screens/analytics_screen.dart
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';

import { dbHelper } from '../db/database';
import { TransactionModel } from '../models/Transaction';
import { TEAL, BLUE, GREY, PRIMARIES } from '../theme';

const FILTERS = ['This Month', 'Last 3 Months', 'All Time'];

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  format(new Date(2023, i, 1), 'MMM')
);

export default function AnalyticsScreen() {
  const [selectedFilter, setSelectedFilter] = useState('This Month');
  const [transactions, setTransactions] = useState<TransactionModel[]>([]);
  const [spendingCategories, setSpendingCategories] = useState<
    Record<string, number>
  >({});
  const [totalCashback, setTotalCashback] = useState(0);
  const [cappedCashback, setCappedCashback] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactions = useCallback(async (filter: string) => {
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
    let total = 0;
    let capped = 0;
    const monthlyCashback: Record<string, number> = {};

    for (const txn of filtered) {
      total += txn.cashback;
      const key = `${txn.date.getFullYear()}-${txn.date.getMonth() + 1}`;
      monthlyCashback[key] = (monthlyCashback[key] ?? 0) + txn.cashback;
      categoryData[txn.category] =
        (categoryData[txn.category] ?? 0) + txn.amount;
    }

    for (const monthly of Object.values(monthlyCashback)) {
      capped += monthly > 400 ? 400 : monthly;
    }

    setTransactions(filtered);
    setSpendingCategories(categoryData);
    setTotalCashback(total);
    setCappedCashback(capped);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTransactions(selectedFilter);
    }, [loadTransactions, selectedFilter])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Analytics</Text>
        <View style={styles.filterPicker}>
          <Picker
            selectedValue={selectedFilter}
            onValueChange={(value) => {
              const v = String(value);
              setSelectedFilter(v);
              loadTransactions(v);
            }}
          >
            {FILTERS.map((f) => (
              <Picker.Item key={f} label={f} value={f} />
            ))}
          </Picker>
        </View>
      </View>

      <Text style={styles.totalCashback}>
        Total Cashback: ₹{totalCashback.toFixed(2)}
      </Text>
      <Text style={styles.cappedCashback}>
        Capped Cashback: ₹{cappedCashback.toFixed(2)}
      </Text>

      <Text style={styles.sectionTitle}>Spending by Category:</Text>
      <SpendingChart isLoading={isLoading} data={spendingCategories} />

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        Cashback Progress:
      </Text>
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
        <ActivityIndicator color={TEAL} />
      </View>
    );
  }
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <View style={styles.chartBox}>
        <Text style={styles.emptyText}>No data found</Text>
      </View>
    );
  }

  const pieData = entries.map(([category, amount], i) => ({
    value: amount,
    color: PRIMARIES[i % PRIMARIES.length],
    label: category,
  }));

  return (
    <View style={{ alignItems: 'center', marginTop: 12 }}>
      <PieChart
        data={pieData}
        donut
        radius={90}
        innerRadius={50}
        innerCircleColor="#fff"
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
        <ActivityIndicator color={TEAL} />
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

  // Cashback summed per calendar month (Jan..Dec), matching the Dart fold.
  const cashbackByMonth = Array.from({ length: 12 }, (_, monthIndex) =>
    transactions
      .filter((txn) => txn.date.getMonth() === monthIndex)
      .reduce((sum, txn) => sum + txn.cashback, 0)
  );

  const barData = cashbackByMonth.map((value, i) => ({
    value,
    label: MONTH_NAMES[i],
    frontColor: BLUE,
  }));

  return (
    <View style={{ marginTop: 12 }}>
      <BarChart
        data={barData}
        barWidth={14}
        spacing={14}
        roundedTop
        frontColor={BLUE}
        yAxisLabelPrefix="₹"
        noOfSections={4}
        xAxisLabelTextStyle={{ fontSize: 10 }}
        yAxisTextStyle={{ fontSize: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff', paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  filterPicker: { width: 170 },
  totalCashback: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  cappedCashback: { fontSize: 18, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  chartBox: { height: 200, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: GREY },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legendLabel: { fontSize: 14 },
});
