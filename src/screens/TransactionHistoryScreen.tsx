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
import { MIDNIGHT, GOLD, EMERALD, SLATE, SLATE_100, SLATE_200, RED, RED_LIGHT } from '../theme';

const CATEGORIES = ['All', 'Online Shopping', 'Bill Payment', 'Others'];

const CATEGORY_COLOR: Record<string, string> = {
  'Online Shopping': GOLD,
  'Bill Payment': '#0EA5E9',
  'Others': SLATE,
};

export default function TransactionHistoryScreen() {
  const [transactions, setTransactions] = useState<TransactionModel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [pickerStage, setPickerStage] = useState<'none' | 'start' | 'end'>('none');

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
      'Delete transaction',
      'This cannot be undone.',
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

  const hasDateFilter = startDate !== null || endDate !== null;

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
            style={styles.picker}
          >
            <Picker.Item label="All categories" value="" />
            {CATEGORIES.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.calendarBtn, hasDateFilter && styles.calendarBtnActive]}
          onPress={() => setPickerStage('start')}
        >
          <Ionicons
            name="calendar"
            size={18}
            color={hasDateFilter ? MIDNIGHT : SLATE}
          />
          {hasDateFilter && (
            <TouchableOpacity
              onPress={() => {
                setStartDate(null);
                setEndDate(null);
                applyFilter(selectedCategory, null, null);
              }}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="close-circle" size={14} color={MIDNIGHT} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}
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
              setPickerStage('end');
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
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color={SLATE} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const catColor = CATEGORY_COLOR[item.category] ?? SLATE;
          return (
            <View style={styles.card}>
              <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
              <View style={styles.cardBody}>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.date}>{formatYMMMd(item.date)}</Text>
              </View>
              <View style={styles.trailing}>
                <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                <Text style={styles.cashback}>+₹{item.cashback.toFixed(2)}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => confirmDelete(item)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color={RED} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: SLATE_200,
    backgroundColor: '#fff',
  },
  categoryPicker: { flex: 1 },
  picker: { color: MIDNIGHT },
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: SLATE_100,
    marginLeft: 8,
  },
  calendarBtnActive: {
    backgroundColor: GOLD,
  },

  list: { padding: 16, paddingBottom: 32 },

  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    color: SLATE,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryDot: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  category: { fontSize: 15, fontWeight: '600', color: MIDNIGHT },
  date: { fontSize: 12, color: SLATE, marginTop: 3 },

  trailing: { alignItems: 'flex-end', marginRight: 12 },
  amount: { fontSize: 15, fontWeight: '600', color: MIDNIGHT },
  cashback: { fontSize: 13, fontWeight: '700', color: EMERALD, marginTop: 3 },

  deleteBtn: { padding: 4 },
});
