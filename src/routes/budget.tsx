import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { Amount, Btn, EmptyState, Field, Panel, Progress, TechLabel, TextInput } from "@/components/nothing/ui";
import { computeBudget, spentInMonth, useStore } from "@/lib/store";
import { monthKey, monthLabel, rupee } from "@/lib/format";

export const Route = createFileRoute("/budget")({
  head: () => ({
    meta: [
      { title: "Monthly budget & carry-forward — LEDGER" },
      {
        name: "description",
        content:
          "Set one overall monthly budget, watch remaining spend segment by segment, and carry unused or overspent amounts into the next month automatically.",
      },
      { property: "og:title", content: "Monthly budget & carry-forward — LEDGER" },
      {
        property: "og:description",
        content: "One monthly budget with automatic carry-forward of unused and overspent amounts.",
      },
    ],
  }),
  component: BudgetScreen,
});

function BudgetScreen() {
  const { state, setBudget } = useStore();
  const budget = computeBudget(state);
  const [draft, setDraft] = useState(state.monthlyBudget ? String(state.monthlyBudget) : "");
  const [editing, setEditing] = useState(state.monthlyBudget == null);

  const currentMonth = monthKey(new Date());

  return (
    <AppShell>
      <ScreenHeader title="Budget" meta={`${monthLabel(currentMonth)} · OVERALL MONTHLY`} />

      <div className="space-y-4 p-5">
        {budget && !editing ? (
          <Panel
            label="Current period"
            action={
              <button onClick={() => setEditing(true)} className="label-tech hover:text-foreground">
                EDIT →
              </button>
            }
          >
            <div className="space-y-4 p-4">
              <div>
                <TechLabel>{budget.over ? "Over budget by" : "Remaining this month"}</TechLabel>
                <div className="mt-2 flex items-end gap-2">
                  <Amount value={Math.abs(budget.remaining)} size="xl" />
                  {budget.over && (
                    <span className="mb-2 border border-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Overspent
                    </span>
                  )}
                </div>
              </div>
              <Progress pct={budget.pct} over={budget.over} />
              <dl className="grid grid-cols-2 gap-px bg-border text-sm">
                <Stat label="Base budget" value={rupee(budget.base)} />
                <Stat
                  label="Carry-forward"
                  value={`${budget.carry >= 0 ? "+" : "−"}${rupee(Math.abs(budget.carry))}`}
                />
                <Stat label="Available" value={rupee(budget.available)} />
                <Stat label="Spent" value={rupee(budget.spent)} />
              </dl>
              <p className="label-tech normal-case tracking-normal">
                {budget.pct}% of the available budget is used. Unused budget carries into next month;
                overspending is deducted from it.
              </p>
            </div>
          </Panel>
        ) : (
          <Panel label={state.monthlyBudget == null ? "Set monthly budget" : "Edit monthly budget"}>
            <div className="space-y-4 p-4">
              <Field label="Base monthly budget (INR)" hint="One overall budget. Category budgets come later.">
                <TextInput
                  value={draft}
                  onChange={(v) => setDraft(v.replace(/[^\d]/g, ""))}
                  placeholder="20000"
                  inputMode="numeric"
                  mono
                />
              </Field>
              <div className="flex gap-2">
                {state.monthlyBudget != null && (
                  <Btn variant="ghost" onClick={() => setEditing(false)} className="flex-1">
                    Cancel
                  </Btn>
                )}
                <Btn
                  variant="primary"
                  className="flex-[2]"
                  onClick={() => {
                    const value = Number(draft);
                    if (!value) return;
                    setBudget(value);
                    setEditing(false);
                  }}
                >
                  Save budget
                </Btn>
              </div>
            </div>
          </Panel>
        )}

        <Panel label="Budget history">
          {state.budgetHistory.length ? (
            <ul>
              {[...state.budgetHistory].reverse().map((h) => {
                const left = h.base + h.carryIn - h.spent;
                return (
                  <li
                    key={h.month}
                    className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
                  >
                    <span>
                      <span className="text-sm font-medium">{monthLabel(h.month)}</span>
                      <span className="label-tech mt-1 block">
                        BASE {rupee(h.base)} · SPENT {rupee(h.spent)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="num block text-sm">
                        {left >= 0 ? "+" : "−"}
                        {rupee(Math.abs(left))}
                      </span>
                      <span className="label-tech mt-1 block">
                        {left >= 0 ? "CARRIED FORWARD" : "DEDUCTED"}
                      </span>
                    </span>
                  </li>
                );
              })}
              <li className="flex items-center justify-between gap-4 bg-surface-2 px-4 py-3">
                <span>
                  <span className="text-sm font-medium">{monthLabel(currentMonth)}</span>
                  <span className="label-tech mt-1 block">IN PROGRESS</span>
                </span>
                <span className="num text-sm">{rupee(spentInMonth(state, currentMonth))}</span>
              </li>
            </ul>
          ) : (
            <EmptyState title="No budget history yet" hint="Completed months will be listed here with their carry-forward." />
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-3">
      <TechLabel>{label}</TechLabel>
      <dd className="num mt-1.5 text-sm">{value}</dd>
    </div>
  );
}
