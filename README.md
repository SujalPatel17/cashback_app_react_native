# Cashback Tracker — React Native (Expo)

React Native port of the Flutter `hdfc_rewards` cashback tracker. Tracks
transactions, computes cashback (capped at ₹400/month), shows analytics, and
schedules a 90-day "check your cashback" reminder per transaction.

## Stack

| Concern            | Library                                   |
| ------------------ | ----------------------------------------- |
| Navigation         | React Navigation (bottom tabs + stack)    |
| Local DB           | `expo-sqlite`                             |
| Notifications      | `expo-notifications`                      |
| Charts             | `react-native-gifted-charts` (+ svg)      |
| Key-value storage  | `@react-native-async-storage/async-storage` |
| Date formatting    | `date-fns` + `Intl`                       |
| Dropdowns / dates  | `@react-native-picker/picker`, `@react-native-community/datetimepicker` |

## Project layout

```
App.tsx                       # navigation + app bootstrap (was main.dart)
src/
  models/Transaction.ts       # was models/transaction_model.dart
  db/database.ts              # was db/db_helper.dart  (sqflite -> expo-sqlite)
  services/notifications.ts   # was notifications/notification_service.dart
  utils/format.ts             # intl currency + date helpers
  theme.ts                    # shared colours (Material palette)
  navigation/types.ts         # typed route params
  screens/
    HomeScreen.tsx            # dashboard + FAB
    AddTransactionScreen.tsx  # form + cashback calc + reminder scheduling
    AnalyticsScreen.tsx       # donut + bar charts
    PendingCheckScreen.tsx    # transactions older than 90 days, unchecked
    TransactionHistoryScreen.tsx  # filterable list + delete
```

## Run

```bash
npm install        # or: yarn
npx expo start     # press a for Android, i for iOS, or scan the QR in Expo Go
```

> Notifications and SQLite work on a device/emulator. Charts need
> `react-native-svg`, which Expo links automatically.

## Notes on the migration

- The Flutter `DBHelper` singleton + `sqflite` queries map almost 1:1 onto
  `expo-sqlite`'s async API; the SQL is unchanged.
- Flutter's `BottomNavigationBar` (4 screens) became a bottom-tab navigator;
  the `/add` route became a stacked screen pushed from the Home FAB.
- Screens reload on focus (`useFocusEffect`) instead of awaiting a
  `Navigator.pop` result.
- `flutter_local_notifications` + `timezone` collapse into `expo-notifications`
  with a date trigger; the "skip if in the past" guard is preserved.
- The empty `widgets/`, `utils/`, and `providers/` Dart files had no code to
  port.
