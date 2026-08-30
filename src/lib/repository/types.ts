import type { AppState, Credit, Expense, BudgetHistoryEntry } from '../types';

export interface DataRepository {
  init(): Promise<boolean>;
  loadState(): Promise<AppState>;
  addExpense(expense: Expense): Promise<void>;
  updateExpense(id: string, patch: Partial<Expense>): Promise<void>;
  deleteExpense(id: string): Promise<void>;
  addCredit(credit: Credit): Promise<void>;
  deleteCredit(id: string): Promise<void>;
  addCategory(name: string): Promise<void>;
  removeCategory(name: string): Promise<void>;
  setBudget(amount: number | null): Promise<void>;
  updateBudgetHistory(history: BudgetHistoryEntry[]): Promise<void>;
  updateSettings(patch: Partial<AppState['settings']>): Promise<void>;
  clearAll(): Promise<void>;
  importState(state: AppState): Promise<void>;
}
