import type { DataRepository } from './types';
import type { AppState, Credit, Expense, BudgetHistoryEntry } from '../types';

const STORAGE_KEY = 'nothing-expense-tracker:v1';
const SCHEMA_VERSION = 1;

export class WebMockRepository implements DataRepository {
  private state!: AppState;

  private save() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }
  }

  async init(): Promise<boolean> {
    return false; // For web, assume always initialized for tests
  }

  async loadState(): Promise<AppState> {
    if (typeof window === 'undefined') {
      throw new Error("No window");
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      throw new Error("No data in localStorage");
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || !Array.isArray(parsed.expenses)) {
      throw new Error("Invalid format");
    }
    this.state = { ...parsed, schemaVersion: SCHEMA_VERSION };
    return this.state;
  }

  async addExpense(expense: Expense): Promise<void> {
    this.state.expenses = [expense, ...this.state.expenses];
    this.save();
  }

  async updateExpense(id: string, patch: Partial<Expense>): Promise<void> {
    this.state.expenses = this.state.expenses.map(e => e.id === id ? { ...e, ...patch } : e);
    this.save();
  }

  async deleteExpense(id: string): Promise<void> {
    this.state.expenses = this.state.expenses.filter(e => e.id !== id);
    this.save();
  }

  async addCredit(credit: Credit): Promise<void> {
    this.state.credits = [credit, ...this.state.credits];
    this.save();
  }

  async deleteCredit(id: string): Promise<void> {
    this.state.credits = this.state.credits.filter(c => c.id !== id);
    this.save();
  }

  async addCategory(name: string): Promise<void> {
    if (!this.state.categories.includes(name)) {
      this.state.categories = [...this.state.categories, name];
      this.save();
    }
  }

  async removeCategory(name: string): Promise<void> {
    this.state.categories = this.state.categories.filter(c => c !== name);
    this.save();
  }

  async setBudget(amount: number | null): Promise<void> {
    this.state.monthlyBudget = amount;
    this.save();
  }

  async updateBudgetHistory(history: BudgetHistoryEntry[]): Promise<void> {
    this.state.budgetHistory = history;
    this.save();
  }

  async updateSettings(patch: Partial<AppState['settings']>): Promise<void> {
    this.state.settings = { ...this.state.settings, ...patch };
    this.save();
  }

  async clearAll(): Promise<void> {
    this.state.expenses = [];
    this.state.credits = [];
    this.state.categories = ["Food", "Transport", "Shopping", "Education", "Bills"];
    this.state.budgetHistory = [];
    this.state.monthlyBudget = null;
    this.save();
  }

  async importState(state: AppState): Promise<void> {
    this.state = state;
    this.save();
  }
}
