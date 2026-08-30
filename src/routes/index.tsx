import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { AppShell } from "@/components/AppShell";
import { TransactionOverlay } from "@/components/DetectionOverlay";
import { ExpenseList } from "@/components/ExpenseList";
import {
  AddAmountSheet,
  AddExpenseSheet,
  ExpenseDetailsSheet,
} from "@/components/ExpenseSheets";
import { Amount, Btn, DotStrip, EmptyState, Panel, Progress, TechLabel } from "@/components/nothing/ui";
import { computeBalances, computeBudget, computeInsights, spentInMonth, spentToday, useStore } from "@/lib/store";
import { monthKey, monthLabel, rupee } from "@/lib/format";
import type { Expense, TransactionCandidate } from "@/lib/types";
import { onPendingTransactions, syncPendingTransactions, syncSavedTransactions, acknowledgeTransactions } from "@/lib/plugins/NotificationBridge";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!sessionStorage.getItem("hasSeenLanding")) {
      sessionStorage.setItem("hasSeenLanding", "true");
      throw redirect({ to: "/landing" });
    }
  },
  head: () => ({
    meta: [
      { title: "LEDGER — Nothing-inspired expense tracker" },
      {
        name: "description",
        content:
          "LEDGER records why money was spent: detect UPI notifications, confirm the reason in one tap, and track account, cash, and budget in a dark technical interface.",
      },
      { property: "og:title", content: "LEDGER — Nothing-inspired expense tracker" },
      {
        property: "og:description",
        content:
          "Pay, detect, record the reason, and see where the money goes. A dark monochrome expense tracker for UPI and cash.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { state, addExpense: saveExpense, addCredit: saveCredit } = useStore();
  const [addExpense, setAddExpense] = useState(false);
  const [addAmount, setAddAmount] = useState(false);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [candidate, setCandidate] = useState<TransactionCandidate | null>(null);

  // Sync with native pending queue
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerRef: any = null;

    const setupListener = async () => {
      try {
        listenerRef = await onPendingTransactions((transactions) => {
          // Just take the oldest one in the queue to process first
          if (transactions.length > 0 && !candidate) {
            // ensure amounts from native are converted to standard float format if needed (e.g. 50000 paise -> 500)
            const oldest = transactions[0];
            setCandidate({
              ...oldest,
              amount: oldest.amount / 100 // Convert back to rupees for the React UI layer
            });
          }
        });
        // trigger a manual sync to fetch anything missed while app was closed
        await syncPendingTransactions();

        // fetch anything that was saved natively in the background overlay
        const saved = await syncSavedTransactions();
        for (const item of saved) {
          const isCredit = item.type === "credit";
          const value = item.amount / 100; // Native amounts are in paise
          if (isCredit) {
            saveCredit({
              amount: value,
              target: (item.paymentSource as any) || "account",
              note: (item.suggestedDescription || "Credit").trim(),
              origin: "detected",
              sourceApp: item.sourceApp,
              createdAt: item.detectedAt,
            });
          } else {
            saveExpense({
              amount: value,
              person: (item.counterparty || "Unknown").trim(),
              category: item.suggestedCategory ?? state.categories[0] ?? "Food",
              description: (item.suggestedDescription || "").trim(),
              source: (item.paymentSource as any) || "account",
              origin: "detected",
              sourceApp: item.sourceApp,
              createdAt: item.detectedAt,
            });
          }
        }
      } catch (err) {
        console.warn("Notification plugin is unavailable or failed to initialize:", err);
      }
    };

    setupListener();

    return () => {
      if (listenerRef && typeof listenerRef.remove === 'function') {
        listenerRef.remove();
      }
    };
  }, [candidate]); // Re-run effect if candidate changes so we can pull the next one

  const balances = computeBalances(state);
  const budget = computeBudget(state);
  const today = spentToday(state);
  const month = spentInMonth(state, monthKey(new Date()));
  const insights = computeInsights(state);
  const recent = state.expenses.slice(0, 5);
  const topInsight = insights[0];

  const handleDismissOverlay = async () => {
    if (candidate && Capacitor.isNativePlatform()) {
      try {
        await acknowledgeTransactions([candidate.id]);
      } catch (err) {
        console.warn("Failed to acknowledge transaction:", err);
      }
    }
    setCandidate(null);
  };

  return (
    <AppShell>
      <header className="relative border-b border-border px-5 pb-5 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <TechLabel>Personal ledger · INR</TechLabel>
            <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.18em]">
                FLOW
                <span
                    aria-hidden="true"
                    className="ml-1.5 inline-block h-2.5 w-2.5 bg-primary"
                />
            </h1>
          </div>
          <span className="label-tech text-right">
            {monthLabel(monthKey(new Date()))}
            <span className="mt-1 block">
              {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </span>
          </span>
        </div>

        <div className="mt-6">
          <TechLabel>Total balance</TechLabel>
          <div className="mt-2 flex items-end gap-3">
            <Amount value={balances.total} size="xl" />
            <span className="label-tech pb-2">ACCOUNT + CASH</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-px bg-border">
          <div className="bg-surface p-4">
            <TechLabel>Account</TechLabel>
            <Amount value={balances.account} size="md" className="mt-2 block" />
          </div>
          <div className="bg-surface p-4">
            <TechLabel>Cash</TechLabel>
            <Amount value={balances.cash} size="md" className="mt-2 block" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px bg-border">
        <button
          onClick={() => setAddExpense(true)}
          className="tap flex items-center justify-center gap-2 bg-primary px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-opacity active:opacity-80"
        >
          <span aria-hidden className="text-base leading-none">−</span> Add expense
        </button>
        <button
          onClick={() => setAddAmount(true)}
          className="tap flex items-center justify-center gap-2 bg-surface px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-surface-2"
        >
          <span aria-hidden className="text-base leading-none">+</span> Add amount
        </button>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-px bg-border">
          <div className="bg-surface p-4">
            <TechLabel>Today</TechLabel>
            <Amount value={today} size="md" className="mt-2 block" />
          </div>
          <div className="bg-surface p-4">
            <TechLabel>This month</TechLabel>
            <Amount value={month} size="md" className="mt-2 block" />
          </div>
        </div>

        <Panel
          label="Monthly budget"
          action={
            <Link to="/budget" className="label-tech hover:text-foreground">
              MANAGE →
            </Link>
          }
        >
          {budget ? (
            <div className="space-y-3 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span>
                  <TechLabel>{budget.over ? "Over budget by" : "Remaining"}</TechLabel>
                  <Amount value={Math.abs(budget.remaining)} size="lg" className="mt-1.5 block" />
                </span>
                <span className="text-right">
                  <span className="num block text-sm">{rupee(budget.spent)}</span>
                  <span className="label-tech mt-1 block">OF {rupee(budget.available)}</span>
                </span>
              </div>
              <Progress pct={budget.pct} over={budget.over} />
              <p className="label-tech normal-case tracking-normal">
                {budget.over ? "OVERSPENT — " : ""}
                {budget.pct}% used · carry-forward {budget.carry >= 0 ? "+" : "−"}
                {rupee(Math.abs(budget.carry))}
              </p>
            </div>
          ) : (
            <EmptyState
              title="Monthly budget not set"
              hint="Set an overall monthly budget to track remaining spend and carry-forward."
              action={
                <Link to="/budget">
                  <Btn>Set budget</Btn>
                </Link>
              }
            />
          )}
        </Panel>

        {topInsight && (
          <Panel
            label="Spending insight"
            action={
              <Link to="/insights" className="label-tech hover:text-foreground">
                ALL →
              </Link>
            }
          >
            <div className="flex items-center gap-4 p-4">
              <div aria-hidden className="dot-grid-red h-10 w-10 shrink-0 opacity-80" />
              <div>
                <TechLabel>{topInsight.label}</TechLabel>
                <p className="mt-1.5 text-lg font-medium">{topInsight.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{topInsight.detail}</p>
              </div>
            </div>
          </Panel>
        )}


        <Panel
          label="Recent expenses"
          action={
            <Link to="/history" className="label-tech hover:text-foreground">
              HISTORY →
            </Link>
          }
        >
          {recent.length ? (
            <ExpenseList expenses={recent} onSelect={setSelected} />
          ) : (
            <EmptyState
              title="No expenses yet"
              hint="Record your first expense — cash or account — and it will appear here."
              action={<Btn onClick={() => setAddExpense(true)}>Add expense</Btn>}
            />
          )}
        </Panel>

        <DotStrip />
      </div>

      <AddExpenseSheet open={addExpense} onClose={() => setAddExpense(false)} />
      <AddAmountSheet open={addAmount} onClose={() => setAddAmount(false)} />
      <ExpenseDetailsSheet expense={selected} onClose={() => setSelected(null)} />
      <TransactionOverlay candidate={candidate} onDismiss={handleDismissOverlay} />
    </AppShell>
  );
}
