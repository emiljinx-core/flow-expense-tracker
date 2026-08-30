import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { Expense, Credit, BudgetHistoryEntry } from "../types";
import type { IDataRepository, generateId } from "./repository";

const DB_NAME = "ledger.db";
const DB_VERSION = 1;
const SCHEMA_KEY = "ledger_schema_version";

const SCHEMA_SQL = `
-- LEDGER Expense Tracker SQLite Schema
-- Version 1

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  person TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('account', 'cash')),
  created_at TEXT NOT NULL,
  origin TEXT NOT NULL CHECK(origin IN ('manual', 'detected')),
  source_app TEXT
);

-- Credits table
CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  target TEXT NOT NULL CHECK(target IN ('account', 'cash')),
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  origin TEXT NOT NULL CHECK(origin IN ('manual', 'detected')),
  source_app TEXT
);

-- Budget history table
CREATE TABLE IF NOT EXISTS budget_history (
  month TEXT PRIMARY KEY,
  base REAL NOT NULL,
  carry_in REAL NOT NULL,
  spent REAL NOT NULL
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  name TEXT PRIMARY KEY,
  is_default INTEGER NOT NULL DEFAULT 0
);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_source ON expenses(source);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_target ON credits(target);
CREATE INDEX IF NOT EXISTS idx_budget_history_month ON budget_history(month);
`;

/**
 * SQLite Repository Implementation
 * Uses @capacitor-community/sqlite on Android
 * Falls back to sql.js for web development
 */
export class SQLiteRepository implements IDataRepository {
  private db: any = null; // SQLiteDBConnection or sql.js Database
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const platform = Capacitor.getPlatform();

    if (platform === "android" || platform === "ios") {
      await this.initializeNativeSQLite();
    } else {
      await this.initializeWebSQLite();
    }

    this.initialized = true;
  }

  private async initializeNativeSQLite(): Promise<void> {
    try {
      const { CapacitorSQLite, SQLiteConnection } = await import("@capacitor-community/sqlite");
      
      const sqliteConnection = new SQLiteConnection(CapacitorSQLite);
      const db = await sqliteConnection.createConnection(DB_NAME, false, "no-encryption", 1, false);
      
      await db.open();
      this.db = db;

      // Check if schema needs migration
      const { value: schemaVersion } = await Preferences.get({ key: SCHEMA_KEY });
      const currentVersion = schemaVersion ? parseInt(schemaVersion, 10) : 0;

      if (currentVersion < DB_VERSION) {
        await this.createSchema(db);
        await Preferences.set({ key: SCHEMA_KEY, value: DB_VERSION.toString() });
      }
    } catch (error) {
      console.error("Failed to initialize native SQLite:", error);
      throw new Error("SQLite initialization failed");
    }
  }

  private async initializeWebSQLite(): Promise<void> {
    try {
      const initSqlJs = await import("sql.js");
      const SQL = await initSqlJs.default({
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
      });

      // Check for existing DB in IndexedDB
      const { value: dbData } = await Preferences.get({ key: "ledger_db_data" });
      
      if (dbData) {
        const uint8Array = new Uint8Array(
          atob(dbData)
            .split("")
            .map((c) => c.charCodeAt(0))
        );
        this.db = new SQL.Database(uint8Array);
      } else {
        this.db = new SQL.Database();
        await this.createSchema(this.db);
      }

      // Save DB on changes
      this.saveWebDB();
    } catch (error) {
      console.error("Failed to initialize web SQLite:", error);
      throw new Error("SQLite initialization failed");
    }
  }

  private async createSchema(db: any): Promise<void> {
    const statements = SCHEMA_SQL
      .split(";")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    for (const statement of statements) {
      try {
        if (db.run) {
          db.run(statement);
        } else {
          await db.execute(statement);
        }
      } catch (error) {
        console.error("Schema execution error:", error, statement);
      }
    }

    // Insert default categories
    const defaultCategories = ["Food", "Transport", "Shopping", "Education", "Bills"];
    for (const cat of defaultCategories) {
      try {
        if (db.run) {
          db.run("INSERT OR IGNORE INTO categories (name, is_default) VALUES (?, 1)", [cat]);
        } else {
          await db.execute("INSERT OR IGNORE INTO categories (name, is_default) VALUES (?, 1)", [cat]);
        }
      } catch (error) {
        // Ignore if already exists
      }
    }
  }

  private async saveWebDB(): Promise<void> {
    if (Capacitor.getPlatform() !== "web" || !this.db) return;

    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const base64 = buffer.toString("base64");
      await Preferences.set({ key: "ledger_db_data", value: base64 });
    } catch (error) {
      console.error("Failed to save web DB:", error);
    }
  }

  async getAllExpenses(): Promise<Expense[]> {
    await this.initialize();
    
    let rows: any[];
    if (this.db.run) {
      const result = this.db.exec("SELECT * FROM expenses ORDER BY created_at DESC");
      rows = result.length > 0 ? result[0].values : [];
    } else {
      const result = await this.db.query("SELECT * FROM expenses ORDER BY created_at DESC");
      rows = result.values || [];
    }

    return rows.map((row: any[]) => this.rowToExpense(row));
  }

  async addExpense(expense: Omit<Expense, "id" | "createdAt"> & { createdAt?: string; id?: string }): Promise<Expense> {
    await this.initialize();
    
    const id = expense.id || this.generateId("exp");
    const now = expense.createdAt || new Date().toISOString();

    const stmt = `
      INSERT INTO expenses (id, amount, person, category, description, source, created_at, origin, source_app)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      expense.amount,
      expense.person,
      expense.category,
      expense.description,
      expense.source,
      now,
      expense.origin,
      expense.sourceApp || null,
    ];

    if (this.db.run) {
      this.db.run(stmt, params);
    } else {
      await this.db.execute(stmt, params);
    }

    await this.saveWebDB();

    return {
      id,
      ...expense,
      createdAt: now,
    };
  }

  async updateExpense(id: string, updates: Partial<Omit<Expense, "id" | "createdAt">>): Promise<void> {
    await this.initialize();

    const fields: string[] = [];
    const params: any[] = [];

    if (updates.amount !== undefined) {
      fields.push("amount = ?");
      params.push(updates.amount);
    }
    if (updates.person !== undefined) {
      fields.push("person = ?");
      params.push(updates.person);
    }
    if (updates.category !== undefined) {
      fields.push("category = ?");
      params.push(updates.category);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      params.push(updates.description);
    }
    if (updates.source !== undefined) {
      fields.push("source = ?");
      params.push(updates.source);
    }
    if (updates.origin !== undefined) {
      fields.push("origin = ?");
      params.push(updates.origin);
    }
    if (updates.sourceApp !== undefined) {
      fields.push("source_app = ?");
      params.push(updates.sourceApp);
    }

    if (fields.length === 0) return;

    params.push(id);
    const stmt = `UPDATE expenses SET ${fields.join(", ")} WHERE id = ?`;

    if (this.db.run) {
      this.db.run(stmt, params);
    } else {
      await this.db.execute(stmt, params);
    }

    await this.saveWebDB();
  }

  async deleteExpense(id: string): Promise<void> {
    await this.initialize();

    if (this.db.run) {
      this.db.run("DELETE FROM expenses WHERE id = ?", [id]);
    } else {
      await this.db.execute("DELETE FROM expenses WHERE id = ?", [id]);
    }

    await this.saveWebDB();
  }

  async getAllCredits(): Promise<Credit[]> {
    await this.initialize();

    let rows: any[];
    if (this.db.run) {
      const result = this.db.exec("SELECT * FROM credits ORDER BY created_at DESC");
      rows = result.length > 0 ? result[0].values : [];
    } else {
      const result = await this.db.query("SELECT * FROM credits ORDER BY created_at DESC");
      rows = result.values || [];
    }

    return rows.map((row: any[]) => this.rowToCredit(row));
  }

  async addCredit(credit: Omit<Credit, "id" | "createdAt"> & { createdAt?: string; id?: string }): Promise<Credit> {
    await this.initialize();

    const id = credit.id || this.generateId("cr");
    const now = credit.createdAt || new Date().toISOString();

    const stmt = `
      INSERT INTO credits (id, amount, target, note, created_at, origin, source_app)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      credit.amount,
      credit.target,
      credit.note,
      now,
      credit.origin,
      credit.sourceApp || null,
    ];

    if (this.db.run) {
      this.db.run(stmt, params);
    } else {
      await this.db.execute(stmt, params);
    }

    await this.saveWebDB();

    return {
      id,
      ...credit,
      createdAt: now,
    };
  }

  async deleteCredit(id: string): Promise<void> {
    await this.initialize();

    if (this.db.run) {
      this.db.run("DELETE FROM credits WHERE id = ?", [id]);
    } else {
      await this.db.execute("DELETE FROM credits WHERE id = ?", [id]);
    }

    await this.saveWebDB();
  }

  async getMonthlyBudget(): Promise<number | null> {
    await this.initialize();

    let result: any;
    if (this.db.run) {
      const rows = this.db.exec("SELECT value FROM app_settings WHERE key = 'monthly_budget'");
      result = rows.length > 0 ? rows[0].values[0] : null;
    } else {
      const rows = await this.db.query("SELECT value FROM app_settings WHERE key = 'monthly_budget'");
      result = rows.values?.[0]?.[0] || null;
    }

    return result ? parseFloat(result) : null;
  }

  async setMonthlyBudget(amount: number | null): Promise<void> {
    await this.initialize();

    if (amount === null) {
      if (this.db.run) {
        this.db.run("DELETE FROM app_settings WHERE key = 'monthly_budget'");
      } else {
        await this.db.execute("DELETE FROM app_settings WHERE key = 'monthly_budget'");
      }
    } else {
      if (this.db.run) {
        this.db.run("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('monthly_budget', ?)", [amount.toString()]);
      } else {
        await this.db.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('monthly_budget', ?)", [amount.toString()]);
      }
    }

    await this.saveWebDB();
  }

  async getBudgetHistory(): Promise<BudgetHistoryEntry[]> {
    await this.initialize();

    let rows: any[];
    if (this.db.run) {
      const result = this.db.exec("SELECT * FROM budget_history ORDER BY month DESC");
      rows = result.length > 0 ? result[0].values : [];
    } else {
      const result = await this.db.query("SELECT * FROM budget_history ORDER BY month DESC");
      rows = result.values || [];
    }

    return rows.map((row: any[]) => ({
      month: row[0],
      base: row[1],
      carryIn: row[2],
      spent: row[3],
    }));
  }

  async addBudgetHistory(entry: BudgetHistoryEntry): Promise<void> {
    await this.initialize();

    const stmt = `
      INSERT OR REPLACE INTO budget_history (month, base, carry_in, spent)
      VALUES (?, ?, ?, ?)
    `;

    const params = [entry.month, entry.base, entry.carryIn, entry.spent];

    if (this.db.run) {
      this.db.run(stmt, params);
    } else {
      await this.db.execute(stmt, params);
    }

    await this.saveWebDB();
  }

  async getAllCategories(): Promise<string[]> {
    await this.initialize();

    let rows: any[];
    if (this.db.run) {
      const result = this.db.exec("SELECT name FROM categories ORDER BY name");
      rows = result.length > 0 ? result[0].values : [];
    } else {
      const result = await this.db.query("SELECT name FROM categories ORDER BY name");
      rows = result.values || [];
    }

    return rows.map((row: any[]) => row[0]);
  }

  async addCategory(name: string): Promise<void> {
    await this.initialize();

    if (this.db.run) {
      this.db.run("INSERT OR IGNORE INTO categories (name, is_default) VALUES (?, 0)", [name]);
    } else {
      await this.db.execute("INSERT OR IGNORE INTO categories (name, is_default) VALUES (?, 0)", [name]);
    }

    await this.saveWebDB();
  }

  async removeCategory(name: string): Promise<void> {
    await this.initialize();

    // Only remove if not default
    if (this.db.run) {
      this.db.run("DELETE FROM categories WHERE name = ? AND is_default = 0", [name]);
    } else {
      await this.db.execute("DELETE FROM categories WHERE name = ? AND is_default = 0", [name]);
    }

    await this.saveWebDB();
  }

  async getSetting(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value || null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  async migrateFromLocalStorage(): Promise<{ migrated: boolean; count: number }> {
    if (typeof window === "undefined") {
      return { migrated: false, count: 0 };
    }

    try {
      const raw = window.localStorage.getItem("nothing-expense-tracker:v1");
      if (!raw) {
        return { migrated: false, count: 0 };
      }

      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.expenses)) {
        return { migrated: false, count: 0 };
      }

      let count = 0;

      // Migrate expenses
      for (const expense of data.expenses) {
        try {
          await this.addExpense(expense);
          count++;
        } catch (error) {
          console.error("Failed to migrate expense:", error);
        }
      }

      // Migrate credits
      for (const credit of data.credits || []) {
        try {
          await this.addCredit(credit);
          count++;
        } catch (error) {
          console.error("Failed to migrate credit:", error);
        }
      }

      // Migrate categories
      for (const category of data.categories || []) {
        try {
          await this.addCategory(category);
        } catch (error) {
          console.error("Failed to migrate category:", error);
        }
      }

      // Migrate budget
      if (data.monthlyBudget) {
        await this.setMonthlyBudget(data.monthlyBudget);
      }

      // Migrate budget history
      for (const entry of data.budgetHistory || []) {
        try {
          await this.addBudgetHistory(entry);
        } catch (error) {
          console.error("Failed to migrate budget history:", error);
        }
      }

      // Migrate settings to Preferences
      if (data.settings) {
        await this.setSetting("detectionEnabled", data.settings.detectionEnabled.toString());
        await this.setSetting("monitorAllApps", data.settings.monitorAllApps.toString());
        await this.setSetting("monitoredApps", JSON.stringify(data.settings.monitoredApps));
        await this.setSetting("overlayPermission", data.settings.overlayPermission.toString());
        await this.setSetting("autoBackup", data.settings.autoBackup.toString());
        await this.setSetting("backupLocation", data.settings.backupLocation);
        if (data.settings.lastBackupAt) {
          await this.setSetting("lastBackupAt", data.settings.lastBackupAt);
        }
      }

      // Backup localStorage before clearing
      window.localStorage.setItem("nothing-expense-tracker:v1.backup", raw);
      window.localStorage.removeItem("nothing-expense-tracker:v1");

      return { migrated: true, count };
    } catch (error) {
      console.error("Migration failed:", error);
      return { migrated: false, count: 0 };
    }
  }

  async clearAll(): Promise<void> {
    await this.initialize();

    const tables = ["expenses", "credits", "budget_history", "categories", "app_settings"];
    
    for (const table of tables) {
      if (this.db.run) {
        this.db.run(`DELETE FROM ${table}`);
      } else {
        await this.db.execute(`DELETE FROM ${table}`);
      }
    }

    // Reinsert default categories
    const defaultCategories = ["Food", "Transport", "Shopping", "Education", "Bills"];
    for (const cat of defaultCategories) {
      if (this.db.run) {
        this.db.run("INSERT OR IGNORE INTO categories (name, is_default) VALUES (?, 1)", [cat]);
      } else {
        await this.db.execute("INSERT OR IGNORE INTO categories (name, is_default) VALUES (?, 1)", [cat]);
      }
    }

    await this.saveWebDB();
  }

  private rowToExpense(row: any[]): Expense {
    return {
      id: row[0],
      amount: row[1],
      person: row[2],
      category: row[3],
      description: row[4],
      source: row[5],
      createdAt: row[6],
      origin: row[7],
      sourceApp: row[8] || undefined,
    };
  }

  private rowToCredit(row: any[]): Credit {
    return {
      id: row[0],
      amount: row[1],
      target: row[2],
      note: row[3],
      createdAt: row[4],
      origin: row[5],
      sourceApp: row[6] || undefined,
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
  }
}
