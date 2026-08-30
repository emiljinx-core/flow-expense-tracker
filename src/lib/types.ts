export type PaymentSource = "account" | "cash";

export type Expense = {
  id: string;
  amount: number;
  person: string;
  category: string;
  description: string;
  source: PaymentSource;
  /** ISO timestamp, locked after creation */
  createdAt: string;
  origin: "manual" | "detected";
  sourceApp?: string;
};

export type Credit = {
  id: string;
  amount: number;
  target: PaymentSource;
  note: string;
  createdAt: string;
  origin: "manual" | "detected";
  sourceApp?: string;
};

export type BudgetHistoryEntry = {
  /** YYYY-MM */
  month: string;
  base: number;
  carryIn: number;
  spent: number;
};

export type AppState = {
  schemaVersion: number;
  expenses: Expense[];
  credits: Credit[];
  categories: string[];
  monthlyBudget: number | null;
  budgetHistory: BudgetHistoryEntry[];
  settings: {
    detectionEnabled: boolean;
    monitorAllApps: boolean;
    monitoredApps: string[];
    overlayPermission: boolean;
    autoBackup: boolean;
    backupLocation: string;
    lastBackupAt: string | null;
  };
};

export type TransactionCandidate = {
  id: string;
  type: "debit" | "credit";
  amount: number;
  counterparty: string | null;
  detectedAt: string;
  sourceApp: string;
  suggestedCategory?: string;
  suggestedDescription?: string;
  paymentSource?: string;
  raw: string;
};

export const DEFAULT_CATEGORIES = ["Food", "Transport", "Shopping", "Education", "Bills"];
