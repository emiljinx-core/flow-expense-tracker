import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Preferences } from '@capacitor/preferences';
import type { DataRepository } from './types';
import type { AppState, Credit, Expense, BudgetHistoryEntry, PaymentSource } from '../types';
import { toPaise, toRupees } from './money';

const DB_NAME = 'expense_tracker.db';
const DB_VERSION = 1;

const PREF_KEY_SETTINGS = 'expense_tracker_settings';
const PREF_KEY_MIGRATED = 'expense_tracker_migrated_v1';
const LEGACY_STORAGE_KEY = 'nothing-expense-tracker:v1';

export class SQLiteRepository implements DataRepository {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private defaultCategories = ["Food", "Transport", "Shopping", "Education", "Bills"];

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async init(): Promise<boolean> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        const customElements = window.customElements;
        if (!customElements.get('jeep-sqlite')) {
          await import('jeep-sqlite/loader').then(m => m.defineCustomElements(window));
        }
        const jeepSqlite = document.createElement('jeep-sqlite');
        document.body.appendChild(jeepSqlite);
        await this.sqlite.initWebStore();
      }

      this.db = await this.sqlite.createConnection(
        DB_NAME,
        false,
        'no-encryption',
        DB_VERSION,
        false
      );

      await this.db.open();

      const schema = `
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          amount INTEGER NOT NULL,
          person TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          source TEXT NOT NULL,
          created_at TEXT NOT NULL,
          origin TEXT NOT NULL,
          source_app TEXT
        );

        CREATE TABLE IF NOT EXISTS credits (
          id TEXT PRIMARY KEY,
          amount INTEGER NOT NULL,
          target TEXT NOT NULL,
          note TEXT NOT NULL,
          created_at TEXT NOT NULL,
          origin TEXT NOT NULL,
          source_app TEXT
        );

        CREATE TABLE IF NOT EXISTS categories (
          name TEXT PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS budget_history (
          month TEXT PRIMARY KEY,
          base INTEGER NOT NULL,
          carry_in INTEGER NOT NULL,
          spent INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS monthly_budget (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          amount INTEGER
        );
      `;
      
      await this.db.execute(schema);
      
      const { values } = await this.db.query('SELECT COUNT(*) as count FROM categories');
      let isFresh = false;
      if (values && values[0].count === 0) {
        isFresh = true;
        // Check for migration
        const migrated = await Preferences.get({ key: PREF_KEY_MIGRATED });
        if (!migrated.value) {
          await this.attemptMigration();
        } else {
          // Normal fresh start
          for (const cat of this.defaultCategories) {
            await this.db.run(`INSERT INTO categories (name) VALUES (?)`, [cat]);
          }
        }
      }
      return isFresh;
    } catch (e) {
      console.error('Failed to init SQLite DB', e);
      throw e;
    }
  }

  private async attemptMigration() {
    if (typeof window === 'undefined') return;
    const legacyData = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyData) {
      try {
        const parsed = JSON.parse(legacyData) as AppState;
        
        await this.db!.run('BEGIN TRANSACTION');
        
        for (const exp of parsed.expenses || []) {
          await this.db!.run(
            `INSERT OR IGNORE INTO expenses (id, amount, person, category, description, source, created_at, origin, source_app) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [exp.id, toPaise(exp.amount), exp.person, exp.category, exp.description, exp.source, exp.createdAt, exp.origin, exp.sourceApp || null]
          );
        }

        for (const cr of parsed.credits || []) {
          await this.db!.run(
            `INSERT OR IGNORE INTO credits (id, amount, target, note, created_at, origin, source_app) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [cr.id, toPaise(cr.amount), cr.target, cr.note, cr.createdAt, cr.origin, cr.sourceApp || null]
          );
        }

        const cats = parsed.categories && parsed.categories.length > 0 ? parsed.categories : this.defaultCategories;
        for (const cat of cats) {
          await this.db!.run(`INSERT OR IGNORE INTO categories (name) VALUES (?)`, [cat]);
        }

        for (const bh of parsed.budgetHistory || []) {
          await this.db!.run(
            `INSERT OR IGNORE INTO budget_history (month, base, carry_in, spent) VALUES (?, ?, ?, ?)`,
            [bh.month, toPaise(bh.base), toPaise(bh.carryIn), toPaise(bh.spent)]
          );
        }

        if (parsed.monthlyBudget != null) {
          await this.db!.run(`INSERT OR REPLACE INTO monthly_budget (id, amount) VALUES (1, ?)`, [toPaise(parsed.monthlyBudget)]);
        }

        await this.db!.run('COMMIT');

        // Migrate settings
        if (parsed.settings) {
          await Preferences.set({ key: PREF_KEY_SETTINGS, value: JSON.stringify(parsed.settings) });
        }

        // Mark as migrated without deleting local storage
        await Preferences.set({ key: PREF_KEY_MIGRATED, value: 'true' });
      } catch (e) {
        await this.db!.run('ROLLBACK');
        console.error('Migration failed, fallback to defaults', e);
        for (const cat of this.defaultCategories) {
          await this.db!.run(`INSERT OR IGNORE INTO categories (name) VALUES (?)`, [cat]);
        }
      }
    } else {
      for (const cat of this.defaultCategories) {
        await this.db!.run(`INSERT INTO categories (name) VALUES (?)`, [cat]);
      }
    }
  }

  async loadState(): Promise<AppState> {
    if (!this.db) throw new Error("DB not initialized");
    
    const expRes = await this.db.query('SELECT * FROM expenses ORDER BY created_at DESC');
    const expenses: Expense[] = (expRes.values || []).map(row => ({
      id: row.id,
      amount: toRupees(row.amount),
      person: row.person,
      category: row.category,
      description: row.description,
      source: row.source as PaymentSource,
      createdAt: row.created_at,
      origin: row.origin as 'manual' | 'detected',
      sourceApp: row.source_app || undefined
    }));

    const credRes = await this.db.query('SELECT * FROM credits ORDER BY created_at DESC');
    const credits: Credit[] = (credRes.values || []).map(row => ({
      id: row.id,
      amount: toRupees(row.amount),
      target: row.target as PaymentSource,
      note: row.note,
      createdAt: row.created_at,
      origin: row.origin as 'manual' | 'detected',
      sourceApp: row.source_app || undefined
    }));

    const catRes = await this.db.query('SELECT * FROM categories');
    const categories = (catRes.values || []).map(row => row.name as string);

    const bhRes = await this.db.query('SELECT * FROM budget_history');
    const budgetHistory: BudgetHistoryEntry[] = (bhRes.values || []).map(row => ({
      month: row.month,
      base: toRupees(row.base),
      carryIn: toRupees(row.carry_in),
      spent: toRupees(row.spent)
    }));

    const bRes = await this.db.query('SELECT amount FROM monthly_budget WHERE id = 1');
    const monthlyBudget = bRes.values && bRes.values.length > 0 && bRes.values[0].amount != null 
      ? toRupees(bRes.values[0].amount) 
      : null;

    const prefRes = await Preferences.get({ key: PREF_KEY_SETTINGS });
    let settings = {
      detectionEnabled: true,
      monitorAllApps: false,
      monitoredApps: ['GPay', 'Samsung Messages', 'HDFC Bank'],
      overlayPermission: true,
      autoBackup: false,
      backupLocation: 'Internal storage / ExpenseTracker/backups',
      lastBackupAt: null as string | null,
    };
    if (prefRes.value) {
      settings = { ...settings, ...JSON.parse(prefRes.value) };
    }

    return {
      schemaVersion: 1,
      expenses,
      credits,
      categories,
      monthlyBudget,
      budgetHistory,
      settings
    };
  }

  async addExpense(expense: Expense): Promise<void> {
    const res = await this.db!.run(
      `INSERT INTO expenses (id, amount, person, category, description, source, created_at, origin, source_app) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [expense.id, toPaise(expense.amount), expense.person, expense.category, expense.description, expense.source, expense.createdAt, expense.origin, expense.sourceApp || null]
    );
    if (res.changes?.changes === 0) throw new Error("Failed to add expense");
    if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(DB_NAME);
  }

  async updateExpense(id: string, patch: Partial<Expense>): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    if (patch.amount !== undefined) { updates.push('amount = ?'); values.push(toPaise(patch.amount)); }
    if (patch.person !== undefined) { updates.push('person = ?'); values.push(patch.person); }
    if (patch.category !== undefined) { updates.push('category = ?'); values.push(patch.category); }
    if (patch.description !== undefined) { updates.push('description = ?'); values.push(patch.description); }
    if (patch.source !== undefined) { updates.push('source = ?'); values.push(patch.source); }
    
    if (updates.length > 0) {
      values.push(id);
      const res = await this.db!.run(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, values);
      if (res.changes?.changes === 0) throw new Error("Failed to update expense");
      if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(DB_NAME);
    }
  }

  async deleteExpense(id: string): Promise<void> {
    const res = await this.db!.run(`DELETE FROM expenses WHERE id = ?`, [id]);
    if (res.changes?.changes === 0) throw new Error("Failed to delete expense");
    if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(DB_NAME);
  }

  async addCredit(credit: Credit): Promise<void> {
    const res = await this.db!.run(
      `INSERT INTO credits (id, amount, target, note, created_at, origin, source_app) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [credit.id, toPaise(credit.amount), credit.target, credit.note, credit.createdAt, credit.origin, credit.sourceApp || null]
    );
    if (res.changes?.changes === 0) throw new Error("Failed to add credit");
    if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(DB_NAME);
  }

  async deleteCredit(id: string): Promise<void> {
    const res = await this.db!.run(`DELETE FROM credits WHERE id = ?`, [id]);
    if (res.changes?.changes === 0) throw new Error("Failed to delete credit");
    if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(DB_NAME);
  }

  async addCategory(name: string): Promise<void> {
    const res = await this.db!.run(`INSERT OR IGNORE INTO categories (name) VALUES (?)`, [name]);
    if (Capacitor.getPlatform() === 'web' && res.changes?.changes && res.changes.changes > 0) {
      await this.sqlite.saveToStore(DB_NAME);
    }
  }

  async removeCategory(name: string): Promise<void> {
    const res = await this.db!.run(`DELETE FROM categories WHERE name = ?`, [name]);
    if (res.changes?.changes === 0) throw new Error("Failed to remove category");
    if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(DB_NAME);
  }

  async setBudget(amount: number | null): Promise<void> {
    let res;
    if (amount == null) {
      res = await this.db!.run(`DELETE FROM monthly_budget WHERE id = 1`);
    } else {
      res = await this.db!.run(`INSERT OR REPLACE INTO monthly_budget (id, amount) VALUES (1, ?)`, [toPaise(amount)]);
    }
    if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(DB_NAME);
  }

  async updateBudgetHistory(history: BudgetHistoryEntry[]): Promise<void> {
    await this.db!.run('BEGIN TRANSACTION');
    try {
      await this.db!.run(`DELETE FROM budget_history`);
      for (const h of history) {
        await this.db!.run(
          `INSERT INTO budget_history (month, base, carry_in, spent) VALUES (?, ?, ?, ?)`,
          [h.month, toPaise(h.base), toPaise(h.carryIn), toPaise(h.spent)]
        );
      }
      await this.db!.run('COMMIT');
      if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(DB_NAME);
    } catch (e) {
      await this.db!.run('ROLLBACK');
      throw e;
    }
  }

  async updateSettings(patch: Partial<AppState['settings']>): Promise<void> {
    const prefRes = await Preferences.get({ key: PREF_KEY_SETTINGS });
    let settings = {};
    if (prefRes.value) {
      settings = JSON.parse(prefRes.value);
    }
    const updated = { ...settings, ...patch };
    await Preferences.set({ key: PREF_KEY_SETTINGS, value: JSON.stringify(updated) });
  }

  async clearAll(): Promise<void> {
    try {
      await this.db!.execute(`
        DELETE FROM expenses;
        DELETE FROM credits;
        DELETE FROM categories;
        DELETE FROM budget_history;
        DELETE FROM monthly_budget;
      `);
      for (const cat of this.defaultCategories) {
        await this.db!.run(`INSERT INTO categories (name) VALUES (?)`, [cat]);
      }
      if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(DB_NAME);
    } catch (e) {
      throw e;
    }
  }

  async importState(state: AppState): Promise<void> {
    await this.db!.run('BEGIN TRANSACTION');
    try {
      await this.db!.run(`DELETE FROM expenses`);
      for (const exp of state.expenses) {
        await this.db!.run(
          `INSERT INTO expenses (id, amount, person, category, description, source, created_at, origin, source_app) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [exp.id, toPaise(exp.amount), exp.person, exp.category, exp.description, exp.source, exp.createdAt, exp.origin, exp.sourceApp || null]
        );
      }
      await this.db!.run(`DELETE FROM credits`);
      for (const cr of state.credits) {
        await this.db!.run(
          `INSERT INTO credits (id, amount, target, note, created_at, origin, source_app) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [cr.id, toPaise(cr.amount), cr.target, cr.note, cr.createdAt, cr.origin, cr.sourceApp || null]
        );
      }
      await this.db!.run(`DELETE FROM categories`);
      for (const cat of state.categories) {
        await this.db!.run(`INSERT INTO categories (name) VALUES (?)`, [cat]);
      }
      await this.db!.run(`DELETE FROM budget_history`);
      for (const h of state.budgetHistory) {
        await this.db!.run(
          `INSERT INTO budget_history (month, base, carry_in, spent) VALUES (?, ?, ?, ?)`,
          [h.month, toPaise(h.base), toPaise(h.carryIn), toPaise(h.spent)]
        );
      }
      
      if (state.monthlyBudget != null) {
        await this.db!.run(`INSERT OR REPLACE INTO monthly_budget (id, amount) VALUES (1, ?)`, [toPaise(state.monthlyBudget)]);
      } else {
        await this.db!.run(`DELETE FROM monthly_budget WHERE id = 1`);
      }

      await this.db!.run('COMMIT');
      if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(DB_NAME);
      
      await Preferences.set({ key: PREF_KEY_SETTINGS, value: JSON.stringify(state.settings) });
    } catch (e) {
      await this.db!.run('ROLLBACK');
      throw e;
    }
  }
}
