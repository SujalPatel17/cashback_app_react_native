import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { dbHelper } from '../db/database';
import { notificationService } from '../services/notifications';
import { TransactionModel } from '../models/Transaction';
import { formatDdMmmYyyy, formatYMMMd } from '../utils/format';
import {
  MIDNIGHT,
  GOLD,
  GOLD_LIGHT,
  EMERALD,
  SLATE,
  SLATE_100,
  SLATE_200,
  FROST,
} from '../theme';

const CATEGORIES = ['Online Shopping', 'Bill Payment', 'Others'];
const CAP = 400.0;

const CATEGORY_ICONS: Record<string, string> = {
  'Online Shopping': 'cart-outline',
  'Bill Payment': 'receipt-outline',
  'Others': 'ellipsis-horizontal-circle-outline',
};

function cashbackPercentage(category: string): number {
  switch (category) {
    case 'Online Shopping':
      return 5.0;
    case 'Bill Payment':
      return 2.5;
    default:
      return 1.0;
  }
}

export default function AddTransactionScreen() {
  const navigation = useNavigation();

  const [amountText, setAmountText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const [cashback, setCashback] = useState(0);
  const [finalCashback, setFinalCashback] = useState(0);
  const [monthlyCashback, setMonthlyCashback] = useState(0);

  async function calculateCashback(
    category: string | null,
    amountStr: string,
    date: Date
  ) {
    if (category && amountStr.length > 0) {
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        const percent = cashbackPercentage(category);
        const calculated = amount * (percent / 100);
        const currentMonth = await dbHelper.getMonthlyCashback(date);
        const remaining = CAP - currentMonth;

        setCashback(calculated);
        setMonthlyCashback(currentMonth);
        setFinalCashback(
          remaining > 0 ? Math.min(calculated, remaining) : 0.0
        );
      }
    } else {
      setCashback(0);
      setFinalCashback(0);
      setMonthlyCashback(0);
    }
  }

  async function saveTransaction() {
    if (!selectedCategory) {
      Alert.alert('Missing category', 'Pick a category to continue.');
      return;
    }
    const amount = parseFloat(amountText);
    if (!amountText || isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount greater than zero.');
      return;
    }

    const txn = new TransactionModel({
      category: selectedCategory,
      amount,
      date: selectedDate,
      cashback: finalCashback,
    });

    await dbHelper.insertTransaction(txn);

    const scheduledDate = new Date(selectedDate);
    scheduledDate.setDate(scheduledDate.getDate() + 90);
    if (scheduledDate.getTime() > Date.now()) {
      await notificationService.scheduleNotification(
        'Cashback Reminder',
        `Check your cashback for the transaction on ${formatYMMMd(selectedDate)}.`,
        scheduledDate
      );
    }

    navigation.goBack();
  }

  const hasPreview = selectedCategory !== null && amountText.length > 0 && !isNaN(parseFloat(amountText));
  const rate = selectedCategory ? cashbackPercentage(selectedCategory) : null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Amount input */}
      <Text style={styles.fieldLabel}>AMOUNT</Text>
      <View style={styles.amountRow}>
        <Text style={styles.currencyPrefix}>₹</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor={SLATE}
          keyboardType="numeric"
          value={amountText}
          onChangeText={(t) => {
            setAmountText(t);
            calculateCashback(selectedCategory, t, selectedDate);
          }}
        />
      </View>
      <View style={styles.underline} />

      {/* Category chips */}
      <Text style={[styles.fieldLabel, { marginTop: 28 }]}>CATEGORY</Text>
      <View style={styles.chipsRow}>
        {CATEGORIES.map((cat) => {
          const selected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => {
                setSelectedCategory(cat);
                calculateCashback(cat, amountText, selectedDate);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={CATEGORY_ICONS[cat] as any}
                size={14}
                color={selected ? MIDNIGHT : SLATE}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date row */}
      <Text style={[styles.fieldLabel, { marginTop: 28 }]}>DATE</Text>
      <TouchableOpacity
        style={styles.dateRow}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={18} color={SLATE} />
        <Text style={styles.dateText}>{formatDdMmmYyyy(selectedDate)}</Text>
        <Ionicons name="chevron-forward" size={16} color={SLATE} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      <View style={styles.underline} />

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          maximumDate={new Date()}
          minimumDate={new Date(2020, 0, 1)}
          onChange={(_event, date) => {
            setShowPicker(Platform.OS === 'ios');
            if (date) {
              setSelectedDate(date);
              calculateCashback(selectedCategory, amountText, date);
            }
          }}
        />
      )}

      {/* Cashback receipt card */}
      <View style={[styles.receipt, hasPreview && styles.receiptActive]}>
        {!hasPreview ? (
          <View style={styles.receiptPlaceholder}>
            <Ionicons name="sparkles-outline" size={20} color={SLATE} />
            <Text style={styles.receiptPlaceholderText}>
              Enter an amount and category to see your cashback
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptKey}>Cashback rate</Text>
              <Text style={styles.receiptVal}>{rate}%</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptKey}>Calculated</Text>
              <Text style={styles.receiptVal}>₹{cashback.toFixed(2)}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptKey}>Cap used this month</Text>
              <Text style={styles.receiptVal}>
                ₹{monthlyCashback.toFixed(0)} / ₹400
              </Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptTotalKey}>You'll earn</Text>
              <Text style={styles.receiptTotalVal}>₹{finalCashback.toFixed(2)}</Text>
            </View>
          </>
        )}
      </View>

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        style={styles.saveButton}
        onPress={saveTransaction}
        activeOpacity={0.85}
      >
        <Ionicons name="checkmark" size={20} color={MIDNIGHT} />
        <Text style={styles.saveLabel}>Save Transaction</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 40, flexGrow: 1 },

  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: SLATE,
    marginBottom: 10,
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: '700',
    color: MIDNIGHT,
    marginRight: 6,
    paddingBottom: 2,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    color: MIDNIGHT,
    padding: 0,
  },
  underline: {
    height: 1.5,
    backgroundColor: SLATE_200,
    marginTop: 8,
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SLATE_200,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: SLATE,
  },
  chipTextSelected: {
    color: MIDNIGHT,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  dateText: {
    fontSize: 16,
    color: MIDNIGHT,
    fontWeight: '500',
  },

  receipt: {
    marginTop: 28,
    borderRadius: 16,
    padding: 20,
    backgroundColor: SLATE_100,
    minHeight: 100,
  },
  receiptActive: {
    backgroundColor: GOLD_LIGHT,
  },
  receiptPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  receiptPlaceholderText: {
    fontSize: 14,
    color: SLATE,
    flex: 1,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptKey: {
    fontSize: 14,
    color: SLATE,
  },
  receiptVal: {
    fontSize: 14,
    fontWeight: '600',
    color: MIDNIGHT,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 12,
  },
  receiptTotalKey: {
    fontSize: 16,
    fontWeight: '700',
    color: MIDNIGHT,
  },
  receiptTotalVal: {
    fontSize: 22,
    fontWeight: '800',
    color: EMERALD,
    letterSpacing: -0.5,
  },

  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GOLD,
    height: 54,
    borderRadius: 14,
    marginTop: 24,
    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveLabel: {
    color: MIDNIGHT,
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
