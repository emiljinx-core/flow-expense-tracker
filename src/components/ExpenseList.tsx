import type { Expense } from "@/lib/types";
import { dayHeading, dayKey, rupee, timeLabel } from "@/lib/format";
import { TechLabel } from "./nothing/ui";

export function ExpenseList({
  expenses,
  onSelect,
}: {
  expenses: Expense[];
  onSelect: (e: Expense) => void;
}) {
  const groups: { key: string; heading: string; items: Expense[]; total: number }[] = [];
  const sorted = [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const e of sorted) {
    const key = dayKey(e.createdAt);
    const existing = groups.find((g) => g.key === key);
    if (existing) {
      existing.items.push(e);
      existing.total += e.amount;
    } else {
      groups.push({ key, heading: dayHeading(e.createdAt), items: [e], total: e.amount });
    }
  }

  return (
    <div>
      {groups.map((group, gi) => (
        <div key={group.key}>
          <div className="flex items-center justify-between gap-3 bg-surface px-5 py-2">
            <TechLabel>{group.heading}</TechLabel>
            <span className="num text-[11px] text-muted-foreground">{rupee(group.total)}</span>
          </div>
          <ul>
            {group.items.map((e, i) => (
              <li key={e.id} className="animate-rise-in" style={{ animationDelay: `${(gi + i) * 18}ms` }}>
                <button
                  onClick={() => onSelect(e)}
                  className="tap flex w-full items-center gap-4 border-b border-border px-5 py-3.5 text-left transition-colors hover:bg-surface"
                >
                  <span
                    aria-hidden
                    className="h-8 w-[2px] shrink-0"
                    style={{ backgroundColor: e.source === "cash" ? "var(--border-strong)" : "var(--primary)" }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.person}</span>
                    <span className="label-tech mt-1 block truncate normal-case tracking-[0.08em]">
                      {e.category}
                      {e.description ? ` · ${e.description}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="num block text-sm font-medium">-{rupee(e.amount)}</span>
                    <span className="label-tech mt-1 block">
                      {e.source === "cash" ? "CASH" : "ACCT"} · {timeLabel(e.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
