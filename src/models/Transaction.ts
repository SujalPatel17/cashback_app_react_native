// Ported from lib/models/transaction_model.dart

/** Shape of a row as stored in SQLite. */
export interface TransactionRow {
  id: number | null;
  category: string;
  amount: number;
  date: string; // ISO-8601 string
  cashback: number;
  cashbackChecked: number; // 0 | 1
}

export class TransactionModel {
  readonly id: number | null;
  readonly category: string;
  readonly amount: number;
  readonly date: Date;
  readonly cashback: number;
  readonly cashbackChecked: boolean;

  constructor(params: {
    id?: number | null;
    category: string;
    amount: number;
    date: Date;
    cashback: number;
    cashbackChecked?: boolean;
  }) {
    // Mirrors the Dart assertion: amount must be positive.
    if (params.amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }
    this.id = params.id ?? null;
    this.category = params.category;
    this.amount = params.amount;
    this.date = params.date;
    this.cashback = params.cashback;
    this.cashbackChecked = params.cashbackChecked ?? false;
  }

  /** Convert to a plain row for the DB. */
  toMap(): TransactionRow {
    return {
      id: this.id,
      category: this.category,
      amount: this.amount,
      date: this.date.toISOString(),
      cashback: this.cashback,
      cashbackChecked: this.cashbackChecked ? 1 : 0,
    };
  }

  /** Build a model from a DB row. */
  static fromMap(map: TransactionRow): TransactionModel {
    return new TransactionModel({
      id: map.id,
      category: map.category,
      amount: map.amount,
      date: new Date(map.date),
      cashback: map.cashback,
      cashbackChecked: map.cashbackChecked === 1,
    });
  }
}
