import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { dbHelper } from '../db/database';
import { TransactionModel } from '../models/Transaction';
import { formatYMMMd } from '../utils/format';
import { MIDNIGHT, GOLD, GOLD_LIGHT, SLATE, SLATE_100, SLATE_200 } from '../theme';

export default function PendingCheckScreen() {
  const [pending, setPending] = useState<TransactionModel[]>([]);

  const load = useCallback(async () => {
    setPending(await dbHelper.getPendingCashbackChecks());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function markAsChecked(txn: TransactionModel) {
    if (txn.id != null) {
      await dbHelper.markCashbackChecked(txn.id);
      load();
    }
  }

  if (pending.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="checkmark-circle" size={48} color={GOLD} />
        </View>
        <Text style={styles.emptyTitle}>All clear</Text>
        <Text style={styles.emptyText}>
          No pending cashback to verify. Transactions appear here 90 days after they're added.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      data={pending}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardLeft}>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.detail}>
              ₹{item.amount.toFixed(2)} · {formatYMMMd(item.date)}
            </Text>
            <Text style={styles.cashback}>
              Cashback: ₹{item.cashback.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.checkBtn}
            onPress={() => markAsChecked(item)}
            activeOpacity={0.75}
          >
            <Ionicons name="checkmark" size={16} color={MIDNIGHT} />
            <Text style={styles.checkBtnText}>Verified</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16, paddingBottom: 32 },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: GOLD_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: MIDNIGHT,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: SLATE,
    textAlign: 'center',
    lineHeight: 22,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLeft: { flex: 1 },
  category: {
    fontSize: 15,
    fontWeight: '700',
    color: MIDNIGHT,
    marginBottom: 4,
  },
  detail: {
    fontSize: 13,
    color: SLATE,
  },
  cashback: {
    fontSize: 13,
    fontWeight: '600',
    color: GOLD,
    marginTop: 3,
  },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GOLD,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 5,
  },
  checkBtnText: {
    color: MIDNIGHT,
    fontWeight: '700',
    fontSize: 13,
  },
});
