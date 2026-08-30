import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { ExpenseList } from "@/components/ExpenseList";
import { AddExpenseSheet, ExpenseDetailsSheet } from "@/components/ExpenseSheets";
import { Btn, EmptyState, Panel, TechLabel, TextInput } from "@/components/nothing/ui";
import { useStore } from "@/lib/store";
import { dayKey, rupee } from "@/lib/format";
import type { Expense } from "@/lib/types";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Expense history & search — LEDGER" },
      {
        name: "description",
        content:
          "Browse every recorded expense grouped by day, filter by category, and search by person or date to find any past transaction.",
      },
      { property: "og:title", content: "Expense history & search — LEDGER" },
      {
        property: "og:description",
        content: "Every expense grouped by day, searchable by person, date, and category.",
      },
    ],
  }),
  component: History,
});

function History() {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [selected, setSelected] = useState<Expense | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    return state.expenses.filter((e) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        e.person.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q);
      const matchesDate = !date || dayKey(e.createdAt) === date;
      const matchesCategory = category === "All" || e.category === category;
      return matchesQuery && matchesDate && matchesCategory;
    });
  }, [state.expenses, query, date, category]);

  const total = filtered.reduce((t, e) => t + e.amount, 0);
  const filtersActive = !!query || !!date || category !== "All";

  return (
    <AppShell>
      <ScreenHeader
        title="History"
        meta={`${state.expenses.length} RECORDED TRANSACTIONS`}
        right={<Btn onClick={() => setAddOpen(true)}>+ Add</Btn>}
      />

      <div className="space-y-3 border-b border-border p-5">
        <TextInput value={query} onChange={setQuery} placeholder="Search person, reason, category…" />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <TechLabel className="mb-1.5">By date</TechLabel>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="num tap w-full border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <TechLabel className="mb-1.5">By category</TechLabel>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="tap w-full border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {["All", ...state.categories].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        {filtersActive && (
          <div className="flex items-center justify-between gap-3">
            <span className="label-tech">
              {filtered.length} MATCHES · {rupee(total)}
            </span>
            <Btn
              variant="ghost"
              onClick={() => {
                setQuery("");
                setDate("");
                setCategory("All");
              }}
            >
              Clear
            </Btn>
          </div>
        )}
      </div>

      {filtered.length ? (
        <ExpenseList expenses={filtered} onSelect={setSelected} />
      ) : (
        <Panel className="m-5">
          <EmptyState
            title={filtersActive ? "No matching expenses found" : "No expenses yet"}
            hint={
              filtersActive
                ? "Adjust the search text, date, or category filter."
                : "Recorded expenses appear here grouped by day."
            }
          />
        </Panel>
      )}

      <ExpenseDetailsSheet expense={selected} onClose={() => setSelected(null)} />
      <AddExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </AppShell>
  );
}
