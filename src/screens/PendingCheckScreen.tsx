// Ported from lib/screens/pending_check_screen.dart
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { dbHelper } from '../db/database';
import { TransactionModel } from '../models/Transaction';
import { formatYMMMd } from '../utils/format';
import { TEAL_50, TEAL_800 } from '../theme';

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
      <View style={styles.center}>
        <Text>No pending cashback transactions.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={pending}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.flex}>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.detail}>
              ₹{item.amount.toFixed(2)} on {formatYMMMd(item.date)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => markAsChecked(item)}
          >
            <Text style={styles.buttonText}>Mark as Checked</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#fff', padding: 16 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  flex: { flex: 1 },
  category: { fontSize: 16, fontWeight: 'bold' },
  detail: { marginTop: 4 },
  button: {
    backgroundColor: TEAL_50,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonText: { color: TEAL_800, fontWeight: '600' },
});
