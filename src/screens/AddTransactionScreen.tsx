// Ported from lib/screens/add_transaction_screen.dart
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { dbHelper } from '../db/database';
import { notificationService } from '../services/notifications';
import { TransactionModel } from '../models/Transaction';
import { formatDdMmmYyyy, formatYMMMd } from '../utils/format';
import { TEAL, GREEN, GREY } from '../theme';

const CATEGORIES = ['Online Shopping', 'Bill Payment', 'Others'];
const CAP = 400.0;

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
    }
  }

  async function saveTransaction() {
    if (!selectedCategory) {
      Alert.alert('Validation', 'Select a category');
      return;
    }
    const amount = parseFloat(amountText);
    if (!amountText || isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Enter a valid amount');
      return;
    }

    const txn = new TransactionModel({
      category: selectedCategory,
      amount,
      date: selectedDate,
      cashback: finalCashback,
    });

    // Step 1: insert.
    await dbHelper.insertTransaction(txn);

    // Step 2 & 3: schedule a reminder 90 days out, only if in the future.
    const scheduledDate = new Date(selectedDate);
    scheduledDate.setDate(scheduledDate.getDate() + 90);
    if (scheduledDate.getTime() > Date.now()) {
      await notificationService.scheduleNotification(
        'Cashback Reminder',
        `Check your cashback for the transaction on ${formatYMMMd(selectedDate)}.`,
        scheduledDate
      );
    } else {
      console.log('Scheduled date must be in the future.');
    }

    // Step 4 & 5: confirm + go back.
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Amount"
        keyboardType="numeric"
        value={amountText}
        onChangeText={(t) => {
          setAmountText(t);
          calculateCashback(selectedCategory, t, selectedDate);
        }}
      />

      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedCategory ?? ''}
          onValueChange={(value) => {
            const cat = value ? String(value) : null;
            setSelectedCategory(cat);
            calculateCashback(cat, amountText, selectedDate);
          }}
        >
          <Picker.Item label="Select a category" value="" color={GREY} />
          {CATEGORIES.map((cat) => (
            <Picker.Item key={cat} label={cat} value={cat} />
          ))}
        </Picker>
      </View>

      <View style={styles.row}>
        <Text style={styles.flex}>
          Date: {formatDdMmmYyyy(selectedDate)}
        </Text>
        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <Text style={styles.link}>Select Date</Text>
        </TouchableOpacity>
      </View>

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

      <View style={styles.summary}>
        <Text style={styles.summaryLine}>
          Calculated Cashback: ₹{cashback.toFixed(2)}
        </Text>
        <Text style={styles.summaryMuted}>
          Monthly Cap Used: ₹{monthlyCashback.toFixed(2)} / ₹400
        </Text>
        <Text style={styles.summaryCredited}>
          Cashback Credited: ₹{finalCashback.toFixed(2)}
        </Text>
      </View>

      <View style={styles.flex} />

      <TouchableOpacity style={styles.saveButton} onPress={saveTransaction}>
        <Ionicons name="save" size={20} color="#fff" />
        <Text style={styles.saveLabel}>Save Transaction</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  flex: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 4,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  link: { color: TEAL, fontWeight: '600' },
  summary: { alignItems: 'center', marginTop: 8 },
  summaryLine: { fontSize: 16, marginBottom: 4 },
  summaryMuted: { fontSize: 14, color: GREY, marginBottom: 4 },
  summaryCredited: { fontSize: 18, fontWeight: 'bold', color: GREEN },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TEAL,
    height: 50,
    borderRadius: 6,
  },
  saveLabel: { color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 16 },
});
