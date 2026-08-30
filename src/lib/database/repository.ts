import type { Expense, Credit, BudgetHistoryEntry } from "../types";

/**
 * Repository interface for data access layer
 * Abstracts storage implementation (SQLite vs localStorage fallback)
 */
export interface IDataRepository {
  // Initialize database
  initialize(): Promise<void>;

  // Expenses
  getAllExpenses(): Promise<Expense[]>;
  addExpense(expense: Omit<Expense, "id" | "createdAt"> & { createdAt?: string; id?: string }): Promise<Expense>;
  updateExpense(id: string, updates: Partial<Omit<Expense, "id" | "createdAt">>): Promise<void>;
  deleteExpense(id: string): Promise<void>;

  // Credits
  getAllCredits(): Promise<Credit[]>;
  addCredit(credit: Omit<Credit, "id" | "createdAt"> & { createdAt?: string; id?: string }): Promise<Credit>;
  deleteCredit(id: string): Promise<void>;

  // Budget
  getMonthlyBudget(): Promise<number | null>;
  setMonthlyBudget(amount: number | null): Promise<void>;
  getBudgetHistory(): Promise<BudgetHistoryEntry[]>;
  addBudgetHistory(entry: BudgetHistoryEntry): Promise<void>;

  // Categories
  getAllCategories(): Promise<string[]>;
  addCategory(name: string): Promise<void>;
  removeCategory(name: string): Promise<void>;

  // Settings (non-financial, stored in Preferences)
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string | null): Promise<void>;

  // Migration
  migrateFromLocalStorage(): Promise<{ migrated: boolean; count: number }>;

  // Clear all data
  clearAll(): Promise<void>;
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
