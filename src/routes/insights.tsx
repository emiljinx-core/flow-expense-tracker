import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { EmptyState, Panel, TechLabel } from "@/components/nothing/ui";
import { categoryTotals, computeInsights, last7Days, useStore } from "@/lib/store";
import { monthKey, monthLabel, rupee } from "@/lib/format";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Spending insights & category breakdown — LEDGER" },
      {
        name: "description",
        content:
          "See your highest spending category, month-over-month changes, average daily spend, and a seven-day spending trend calculated entirely on device.",
      },
      { property: "og:title", content: "Spending insights & category breakdown — LEDGER" },
      {
        property: "og:description",
        content: "Category distribution, weekly trend, and average daily spend from your own records.",
      },
    ],
  }),
  component: Insights,
});

function Insights() {
  const { state } = useStore();
  const insights = computeInsights(state);
  const { rows, total } = categoryTotals(state);
  const week = last7Days(state);
  const peak = Math.max(...week.map((d) => d.amount), 1);

  return (
    <AppShell>
      <ScreenHeader title="Insights" meta={`${monthLabel(monthKey(new Date()))} · ON-DEVICE ANALYSIS`} />

      <div className="space-y-4 p-5">
        {insights.length ? (
          <div className="grid gap-px bg-border">
            {insights.map((i) => (
              <div key={i.label} className="bg-surface p-4">
                <div className="flex items-center gap-2">
                  {i.tone === "accent" && <span aria-hidden className="h-1.5 w-1.5 bg-primary" />}
                  <TechLabel>{i.label}</TechLabel>
                </div>
                <p className="num mt-2 text-2xl font-medium">{i.value}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{i.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <Panel>
            <EmptyState
              title="Not enough transaction data for insights yet"
              hint="Record a few more expenses this month and patterns will appear here."
            />
          </Panel>
        )}

        <Panel label={`Category distribution · ${rupee(total)}`}>
          {rows.length ? (
            <ul className="p-4">
              {rows.map((r, i) => (
                <li key={r.category} className="mb-4 last:mb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">{r.category}</span>
                    <span className="num text-xs text-muted-foreground">
                      {rupee(r.amount)} · {r.pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full bg-surface-2">
                    <div
                      className="animate-bar-grow h-full"
                      style={{
                        width: `${r.pct}%`,
                        backgroundColor: i === 0 ? "var(--primary)" : "var(--foreground)",
                        animationDelay: `${i * 70}ms`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No spending this month" />
          )}
        </Panel>

        <Panel label="Last 7 days">
          <div className="flex items-end gap-2 px-4 pb-3 pt-5" style={{ height: 160 }}>
            {week.map((d, i) => (
              <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="num text-[9px] text-muted-foreground">
                  {d.amount ? Math.round(d.amount / 100) / 10 + "k" : "—"}
                </span>
                <div
                  className="animate-bar-grow w-full"
                  style={{
                    height: `${Math.max(2, (d.amount / peak) * 100)}%`,
                    backgroundColor: i === week.length - 1 ? "var(--primary)" : "var(--border-strong)",
                    animationDelay: `${i * 60}ms`,
                    transformOrigin: "bottom",
                  }}
                />
                <span className="label-tech">{d.label}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
