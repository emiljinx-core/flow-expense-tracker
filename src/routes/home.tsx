import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
import { useNotificationListener } from "@/hooks/use-notification-listener";

export const Route = createFileRoute("/home")({
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
  const { state } = useStore();
  const [addExpense, setAddExpense] = useState(false);
  const [addAmount, setAddAmount] = useState(false);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [candidate, setCandidate] = useState<TransactionCandidate | null>(null);

  // Native notification listener (Android only)
  const notificationListener = useNotificationListener();

  // Show pending transactions when app opens
  useEffect(() => {
    if (notificationListener.isNative && notificationListener.pendingTransactions.length > 0) {
      const firstPending = notificationListener.pendingTransactions[0];
      if (firstPending) {
        setCandidate(firstPending);
      }
    }
  }, [notificationListener.isNative, notificationListener.pendingTransactions]);

  // Listen for new transactions
  useEffect(() => {
    if (notificationListener.isNative && notificationListener.pendingTransactions.length > 0 && !candidate) {
      const latest = notificationListener.pendingTransactions[notificationListener.pendingTransactions.length - 1];
      if (latest) {
        setCandidate(latest);
      }
    }
  }, [notificationListener.pendingTransactions, candidate, notificationListener.isNative]);

  const balances = computeBalances(state);
  const budget = computeBudget(state);
  const today = spentToday(state);
  const month = spentInMonth(state, monthKey(new Date()));
  const insights = computeInsights(state);
  const recent = state.expenses.slice(0, 5);
  const topInsight = insights[0];

  return (
    <AppShell>
      <header className="relative border-b border-border px-5 pb-5 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <TechLabel>Personal ledger · INR</TechLabel>
            <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.18em]">Ledger</h1>
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
      <TransactionOverlay candidate={candidate} onDismiss={() => setCandidate(null)} />
    </AppShell>
  );
}
