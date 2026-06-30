// Ported from lib/db/db_helper.dart
import * as SQLite from 'expo-sqlite';
import { TransactionModel, TransactionRow } from '../models/Transaction';

const DB_NAME = 'transactions.db';

class DBHelper {
  private dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  /** Lazily open + initialise the database (singleton, like the Dart version). */
  private getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = this.initDb();
    }
    return this.dbPromise;
  }

  private async initDb(): Promise<SQLite.SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        amount REAL,
        date TEXT,
        cashback REAL,
        cashbackChecked INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_cashbackChecked ON transactions (cashbackChecked);
      CREATE INDEX IF NOT EXISTS idx_date ON transactions (date);
    `);
    return db;
  }

  async insertTransaction(txn: TransactionModel): Promise<number> {
    try {
      const db = await this.getDb();
      const m = txn.toMap();
      const result = await db.runAsync(
        'INSERT INTO transactions (category, amount, date, cashback, cashbackChecked) VALUES (?, ?, ?, ?, ?)',
        m.category,
        m.amount,
        m.date,
        m.cashback,
        m.cashbackChecked
      );
      return result.lastInsertRowId;
    } catch (e) {
      console.log('Error inserting transaction:', e);
      throw e;
    }
  }

  async getAllTransactions(): Promise<TransactionModel[]> {
    try {
      const db = await this.getDb();
      const rows = await db.getAllAsync<TransactionRow>(
        'SELECT * FROM transactions ORDER BY date DESC'
      );
      return rows.map(TransactionModel.fromMap);
    } catch (e) {
      console.log('Error fetching transactions:', e);
      return [];
    }
  }

  /** Transactions not yet checked and older than 90 days. */
  async getPendingCashbackChecks(): Promise<TransactionModel[]> {
    try {
      const db = await this.getDb();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const rows = await db.getAllAsync<TransactionRow>(
        'SELECT * FROM transactions WHERE cashbackChecked = 0 AND date <= ?',
        ninetyDaysAgo.toISOString()
      );
      return rows.map(TransactionModel.fromMap);
    } catch (e) {
      console.log('Error fetching pending cashback checks:', e);
      return [];
    }
  }

  async markCashbackChecked(id: number): Promise<void> {
    try {
      const db = await this.getDb();
      await db.runAsync(
        'UPDATE transactions SET cashbackChecked = 1 WHERE id = ?',
        id
      );
    } catch (e) {
      console.log('Error marking cashback as checked:', e);
    }
  }

  async clearAll(): Promise<void> {
    try {
      const db = await this.getDb();
      await db.runAsync('DELETE FROM transactions');
    } catch (e) {
      console.log('Error clearing all transactions:', e);
    }
  }

  async getFilteredTransactions(opts: {
    category?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
  }): Promise<TransactionModel[]> {
    const db = await this.getDb();
    const whereClauses: string[] = [];
    const whereArgs: SQLite.SQLiteBindValue[] = [];

    if (opts.category && opts.category.length > 0) {
      whereClauses.push('category = ?');
      whereArgs.push(opts.category);
    }
    if (opts.startDate) {
      whereClauses.push('date >= ?');
      whereArgs.push(opts.startDate.toISOString());
    }
    if (opts.endDate) {
      whereClauses.push('date <= ?');
      whereArgs.push(opts.endDate.toISOString());
    }

    const where =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const rows = await db.getAllAsync<TransactionRow>(
      `SELECT * FROM transactions ${where} ORDER BY date DESC`,
      ...whereArgs
    );
    return rows.map(TransactionModel.fromMap);
  }

  async updateTransaction(txn: TransactionModel): Promise<void> {
    const db = await this.getDb();
    const m = txn.toMap();
    await db.runAsync(
      'UPDATE transactions SET category = ?, amount = ?, date = ?, cashback = ?, cashbackChecked = ? WHERE id = ?',
      m.category,
      m.amount,
      m.date,
      m.cashback,
      m.cashbackChecked,
      m.id
    );
  }

  /** Sum of cashback for the calendar month of `date`. */
  async getMonthlyCashback(date: Date): Promise<number> {
    const db = await this.getDb();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const row = await db.getFirstAsync<{ total: number | null }>(
      'SELECT SUM(cashback) as total FROM transactions WHERE date >= ? AND date <= ?',
      firstDay.toISOString(),
      lastDay.toISOString()
    );
    return row?.total != null ? Number(row.total) : 0.0;
  }

  async deleteTransaction(id: number): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
  }
}

// Single shared instance (matches the Dart `factory DBHelper()` singleton).
export const dbHelper = new DBHelper();
