import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_CATEGORIES,
  type AppState,
  type Credit,
  type Expense,
  type PaymentSource,
} from "./types";
import { dayKey, monthKey } from "./format";
import { getRepository } from "./repository";

export const SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Mock seed data is now generated in WebMockRepository if needed.    */
/* ------------------------------------------------------------------ */

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/* Derivations                                                         */
/* ------------------------------------------------------------------ */

export function computeBalances(state: AppState) {
  const sum = (arr: { amount: number }[]) => arr.reduce((t, x) => t + x.amount, 0);
  const account =
    sum(state.credits.filter((c) => c.target === "account")) -
    sum(state.expenses.filter((e) => e.source === "account"));
  const cash =
    sum(state.credits.filter((c) => c.target === "cash")) -
    sum(state.expenses.filter((e) => e.source === "cash"));
  return { account, cash, total: account + cash };
}

export function spentInMonth(state: AppState, key: string) {
  return state.expenses
    .filter((e) => monthKey(e.createdAt) === key)
    .reduce((t, e) => t + e.amount, 0);
}

export function spentToday(state: AppState) {
  const today = dayKey(new Date());
  return state.expenses
    .filter((e) => dayKey(e.createdAt) === today)
    .reduce((t, e) => t + e.amount, 0);
}

export function computeBudget(state: AppState) {
  const base = state.monthlyBudget;
  if (base == null) return null;
  const carry = state.budgetHistory.reduce(
    (acc, h) => acc + (h.base + h.carryIn - h.spent),
    0,
  );
  const available = base + carry;
  const spent = spentInMonth(state, monthKey(new Date()));
  const remaining = available - spent;
  const pct = available > 0 ? Math.min(100, Math.round((spent / available) * 100)) : 0;
  return { base, carry, available, spent, remaining, pct, over: remaining < 0 };
}

export type Insight = { label: string; value: string; detail: string; tone?: "accent" };

export function computeInsights(state: AppState): Insight[] {
  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const current = state.expenses.filter((e) => monthKey(e.createdAt) === thisMonth);
  if (current.length < 2) return [];

  const byCat = new Map<string, number>();
  for (const e of current) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];

  const prevByCat = new Map<string, number>();
  for (const e of state.expenses.filter((e) => monthKey(e.createdAt) === lastMonth))
    prevByCat.set(e.category, (prevByCat.get(e.category) ?? 0) + e.amount);

  const insights: Insight[] = [];
  if (top) {
    insights.push({
      label: "Top category",
      value: top[0],
      detail: `₹${Math.round(top[1]).toLocaleString("en-IN")} spent this month`,
      tone: "accent",
    });
  }

  let biggestDelta: { cat: string; delta: number } | null = null;
  for (const [cat, amount] of byCat) {
    const delta = amount - (prevByCat.get(cat) ?? 0);
    if (!biggestDelta || Math.abs(delta) > Math.abs(biggestDelta.delta))
      biggestDelta = { cat, delta };
  }
  if (biggestDelta && biggestDelta.delta !== 0 && prevByCat.size > 0) {
    const up = biggestDelta.delta > 0;
    insights.push({
      label: up ? "Increase vs last month" : "Decrease vs last month",
      value: `${up ? "+" : "-"}₹${Math.abs(Math.round(biggestDelta.delta)).toLocaleString("en-IN")}`,
      detail: `${biggestDelta.cat} spending ${up ? "up" : "down"} compared with last month`,
    });
  }

  const days = new Set(current.map((e) => dayKey(e.createdAt))).size || 1;
  const total = current.reduce((t, e) => t + e.amount, 0);
  insights.push({
    label: "Average daily spend",
    value: `₹${Math.round(total / days).toLocaleString("en-IN")}`,
    detail: `Across ${days} active day${days === 1 ? "" : "s"} this month`,
  });

  return insights;
}

export function categoryTotals(state: AppState, key = monthKey(new Date())) {
  const map = new Map<string, number>();
  for (const e of state.expenses.filter((x) => monthKey(x.createdAt) === key))
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  const total = [...map.values()].reduce((t, v) => t + v, 0);
  return {
    total,
    rows: [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      })),
  };
}

export function last7Days(state: AppState) {
  const out: { key: string; label: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    out.push({
      key,
      label: d.toLocaleDateString("en-IN", { weekday: "narrow" }).toUpperCase(),
      amount: state.expenses
        .filter((e) => dayKey(e.createdAt) === key)
        .reduce((t, e) => t + e.amount, 0),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

type RestorePreview = {
  newExpenses: number;
  existingExpenses: number;
  newCredits: number;
  newCategories: number;
  existingCategories: number;
  budgetAvailable: boolean;
  payload: AppState;
};

type Store = {
  state: AppState | null;
  ready: boolean;
  addExpense: (input: Omit<Expense, "id" | "createdAt"> & { createdAt?: string }) => Promise<Expense | null>;
  updateExpense: (id: string, patch: Partial<Omit<Expense, "id" | "createdAt">>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addCredit: (input: Omit<Credit, "id" | "createdAt"> & { createdAt?: string }) => Promise<Credit | null>;
  deleteCredit: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  removeCategory: (name: string) => Promise<void>;
  setBudget: (amount: number | null) => Promise<void>;
  updateSettings: (patch: Partial<AppState["settings"]>) => Promise<void>;
  exportBackup: () => string;
  previewRestore: (json: string) => RestorePreview;
  confirmRestore: (preview: RestorePreview) => Promise<void>;
  clearAll: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [ready, setReady] = useState(false);
  const repo = getRepository();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        await repo.init();
        const loadedState = await repo.loadState();
        if (mounted) {
          setState(loadedState);
          setReady(true);
        }
      } catch (err) {
        console.error("Failed to load store state:", err);
      }
    }
    load();
    return () => { mounted = false; };
  }, [repo]);

  const addExpense = useCallback<Store["addExpense"]>(async (input) => {
    if (!state) return null;
    const expense: Expense = {
      ...input,
      id: id("exp"),
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    try {
      await repo.addExpense(expense);
      setState((s) => s ? { ...s, expenses: [expense, ...s.expenses] } : s);
      return expense;
    } catch (err) {
      console.error("Failed to add expense", err);
      return null;
    }
  }, [state, repo]);

  const updateExpense = useCallback<Store["updateExpense"]>(async (expenseId, patch) => {
    if (!state) return;
    try {
      await repo.updateExpense(expenseId, patch);
      setState((s) => s ? {
        ...s,
        expenses: s.expenses.map((e) => (e.id === expenseId ? { ...e, ...patch } : e)),
      } : s);
    } catch (err) {
      console.error("Failed to update expense", err);
    }
  }, [state, repo]);

  const deleteExpense = useCallback<Store["deleteExpense"]>(async (expenseId) => {
    if (!state) return;
    try {
      await repo.deleteExpense(expenseId);
      setState((s) => s ? { ...s, expenses: s.expenses.filter((e) => e.id !== expenseId) } : s);
    } catch (err) {
      console.error("Failed to delete expense", err);
    }
  }, [state, repo]);

  const addCredit = useCallback<Store["addCredit"]>(async (input) => {
    if (!state) return null;
    const credit: Credit = {
      ...input,
      id: id("cr"),
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    try {
      await repo.addCredit(credit);
      setState((s) => s ? { ...s, credits: [credit, ...s.credits] } : s);
      return credit;
    } catch (err) {
      console.error("Failed to add credit", err);
      return null;
    }
  }, [state, repo]);

  const deleteCredit = useCallback<Store["deleteCredit"]>(async (creditId) => {
    if (!state) return;
    try {
      await repo.deleteCredit(creditId);
      setState((s) => s ? { ...s, credits: s.credits.filter((c) => c.id !== creditId) } : s);
    } catch (err) {
      console.error("Failed to delete credit", err);
    }
  }, [state, repo]);

  const addCategory = useCallback<Store["addCategory"]>(async (name) => {
    if (!state) return;
    const clean = name.trim();
    if (!clean) return;
    try {
      await repo.addCategory(clean);
      setState((s) => {
        if (!s) return s;
        return s.categories.some((c) => c.toLowerCase() === clean.toLowerCase())
          ? s
          : { ...s, categories: [...s.categories, clean] };
      });
    } catch (err) {
      console.error("Failed to add category", err);
    }
  }, [state, repo]);

  const removeCategory = useCallback<Store["removeCategory"]>(async (name) => {
    if (!state) return;
    try {
      await repo.removeCategory(name);
      setState((s) => {
        if (!s) return s;
        return DEFAULT_CATEGORIES.includes(name)
          ? s
          : { ...s, categories: s.categories.filter((c) => c !== name) };
      });
    } catch (err) {
      console.error("Failed to remove category", err);
    }
  }, [state, repo]);

  const setBudget = useCallback<Store["setBudget"]>(async (amount) => {
    if (!state) return;
    try {
      await repo.setBudget(amount);
      setState((s) => s ? { ...s, monthlyBudget: amount } : s);
    } catch (err) {
      console.error("Failed to set budget", err);
    }
  }, [state, repo]);

  const updateSettings = useCallback<Store["updateSettings"]>(async (patch) => {
    if (!state) return;
    try {
      await repo.updateSettings(patch);
      setState((s) => s ? { ...s, settings: { ...s.settings, ...patch } } : s);
    } catch (err) {
      console.error("Failed to update settings", err);
    }
  }, [state, repo]);

  const exportBackup = useCallback(() => {
    if (!state) return "{}";
    const payload = { ...state, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString() };
    updateSettings({ lastBackupAt: new Date().toISOString() }).catch(console.error);
    return JSON.stringify(payload, null, 2);
  }, [state, updateSettings]);

  const previewRestore = useCallback<Store["previewRestore"]>(
    (json) => {
      if (!state) throw new Error("Store not ready");
      const parsed = JSON.parse(json) as AppState;
      if (!parsed || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.credits)) {
        throw new Error("Invalid backup: expected expenses and credits arrays.");
      }
      const key = (e: { amount: number; createdAt: string; person?: string }) =>
        `${e.amount}|${e.createdAt}|${e.person ?? ""}`;
      const existingExpenseKeys = new Set(state.expenses.map(key));
      const existingCreditKeys = new Set(state.credits.map((c) => `${c.amount}|${c.createdAt}`));
      const newExpenses = parsed.expenses.filter((e) => !existingExpenseKeys.has(key(e)));
      const newCredits = parsed.credits.filter(
        (c) => !existingCreditKeys.has(`${c.amount}|${c.createdAt}`),
      );
      const incomingCats = parsed.categories ?? [];
      const newCategories = incomingCats.filter((c) => !state.categories.includes(c));
      return {
        newExpenses: newExpenses.length,
        existingExpenses: parsed.expenses.length - newExpenses.length,
        newCredits: newCredits.length,
        newCategories: newCategories.length,
        existingCategories: incomingCats.length - newCategories.length,
        budgetAvailable: parsed.monthlyBudget != null,
        payload: parsed,
      };
    },
    [state],
  );

  const confirmRestore = useCallback<Store["confirmRestore"]>(async (preview) => {
    if (!state) return;
    try {
      const key = (e: { amount: number; createdAt: string; person?: string }) =>
        `${e.amount}|${e.createdAt}|${e.person ?? ""}`;
      const existingExpenseKeys = new Set(state.expenses.map(key));
      const existingCreditKeys = new Set(state.credits.map((c) => `${c.amount}|${c.createdAt}`));
      const p = preview.payload;
      
      const newExpenses = p.expenses
        .filter((e) => !existingExpenseKeys.has(key(e)))
        .map((e) => ({ ...e, id: id("exp") }));
        
      const newCredits = p.credits
        .filter((c) => !existingCreditKeys.has(`${c.amount}|${c.createdAt}`))
        .map((c) => ({ ...c, id: id("cr") }));
        
      const newCategories = (p.categories ?? []).filter((c) => !state.categories.includes(c));
      
      const newState: AppState = {
        ...state,
        expenses: [...state.expenses, ...newExpenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        credits: [...state.credits, ...newCredits],
        categories: [...state.categories, ...newCategories],
        monthlyBudget: p.monthlyBudget ?? state.monthlyBudget,
        budgetHistory: p.budgetHistory?.length ? p.budgetHistory : state.budgetHistory,
      };

      await repo.importState(newState);
      setState(newState);
    } catch (err) {
      console.error("Failed to restore backup", err);
    }
  }, [state, repo]);

  const clearAll = useCallback(async () => {
    if (!state) return;
    try {
      await repo.clearAll();
      const freshState = await repo.loadState();
      setState(freshState);
    } catch (err) {
      console.error("Failed to clear all", err);
      throw err;
    }
  }, [state, repo]);

  const value = useMemo<Store>(
    () => ({
      state,
      ready,
      addExpense,
      updateExpense,
      deleteExpense,
      addCredit,
      deleteCredit,
      addCategory,
      removeCategory,
      setBudget,
      updateSettings,
      exportBackup,
      previewRestore,
      confirmRestore,
      clearAll,
    }),
    [
      state,
      ready,
      addExpense,
      updateExpense,
      deleteExpense,
      addCredit,
      deleteCredit,
      addCategory,
      removeCategory,
      setBudget,
      updateSettings,
      exportBackup,
      previewRestore,
      confirmRestore,
      clearAll,
    ],
  );

  if (!ready) {
    return (
      <StoreContext.Provider value={value}>
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="text-center text-foreground">
            <div className="label-tech mb-4 animate-pulse">INITIALIZING SECURE STORE</div>
            <div className="mx-auto h-0.5 w-32 overflow-hidden bg-border">
              <div className="h-full w-1/2 animate-[pulse_1.5s_ease-in-out_infinite] bg-primary"></div>
            </div>
          </div>
        </div>
      </StoreContext.Provider>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  if (!ctx.ready || !ctx.state) {
    throw new Error("Store is not ready yet. Handle loading state in UI.");
  }
  // We type cast here because the app currently assumes synchronous state availability everywhere.
  // We should ideally return ctx with state guaranteed to be non-null when ready is true.
  return ctx as Store & { state: AppState };
}