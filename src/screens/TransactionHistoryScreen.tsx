// Ported from lib/screens/transaction_history_screen.dart
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { dbHelper } from '../db/database';
import { TransactionModel } from '../models/Transaction';
import { formatCurrency, formatYMMMd } from '../utils/format';
import { RED } from '../theme';

const CATEGORIES = ['All', 'Online Shopping', 'Bill Payment', 'Others'];

export default function TransactionHistoryScreen() {
  const [transactions, setTransactions] = useState<TransactionModel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  // 'none' | 'start' | 'end' — drives the sequential range picker.
  const [pickerStage, setPickerStage] = useState<'none' | 'start' | 'end'>(
    'none'
  );

  const loadAll = useCallback(async () => {
    setTransactions(await dbHelper.getAllTransactions());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const applyFilter = useCallback(
    async (category: string | null, start: Date | null, end: Date | null) => {
      setTransactions(
        await dbHelper.getFilteredTransactions({
          // 'All' means no category filter, like a null DropdownButton value.
          category: category && category !== 'All' ? category : null,
          startDate: start,
          endDate: end,
        })
      );
    },
    []
  );

  function confirmDelete(txn: TransactionModel) {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (txn.id != null) {
              await dbHelper.deleteTransaction(txn.id);
              applyFilter(selectedCategory, startDate, endDate);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.categoryPicker}>
          <Picker
            selectedValue={selectedCategory ?? ''}
            onValueChange={(value) => {
              const cat = value ? String(value) : null;
              setSelectedCategory(cat);
              applyFilter(cat, startDate, endDate);
            }}
          >
            <Picker.Item label="Category" value="" />
            {CATEGORIES.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} />
            ))}
          </Picker>
        </View>
        <TouchableOpacity onPress={() => setPickerStage('start')}>
          <Ionicons name="calendar" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {pickerStage !== 'none' && (
        <DateTimePicker
          value={(pickerStage === 'start' ? startDate : endDate) ?? new Date()}
          mode="date"
          minimumDate={new Date(2020, 0, 1)}
          maximumDate={new Date()}
          onChange={(_event, date) => {
            if (Platform.OS !== 'ios') setPickerStage('none');
            if (!date) {
              setPickerStage('none');
              return;
            }
            if (pickerStage === 'start') {
              setStartDate(date);
              setPickerStage('end'); // then ask for the end date
            } else {
              setEndDate(date);
              setPickerStage('none');
              applyFilter(selectedCategory, startDate, date);
            }
          }}
        />
      )}

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.flex}>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.date}>{formatYMMMd(item.date)}</Text>
            </View>
            <View style={styles.trailing}>
              <View style={styles.amounts}>
                <Text>{formatCurrency(item.amount)}</Text>
                <Text style={styles.cashback}>
                  Cashback: ₹{item.cashback.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => confirmDelete(item)}
              >
                <Ionicons name="trash" size={22} color={RED} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryPicker: { width: 200 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  flex: { flex: 1 },
  category: { fontSize: 16, fontWeight: '600' },
  date: { color: '#666', marginTop: 2 },
  trailing: { flexDirection: 'row', alignItems: 'center' },
  amounts: { alignItems: 'flex-end' },
  cashback: { fontWeight: 'bold', fontSize: 13, marginTop: 2 },
  deleteBtn: { marginLeft: 8, padding: 4 },
});
