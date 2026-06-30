import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Analytics: undefined;
  PendingChecks: undefined;
  Transactions: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  AddTransaction: undefined;
};
