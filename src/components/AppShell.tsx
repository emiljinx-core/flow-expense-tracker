import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { DotStrip } from "./nothing/ui";

const NAV = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/history", label: "History", icon: ListIcon },
  { to: "/budget", label: "Budget", icon: BudgetIcon },
  { to: "/insights", label: "Insights", icon: ChartIcon },
  { to: "/settings", label: "Settings", icon: GearIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-border bg-background">
      <main className="flex-1 pb-24">{children}</main>

      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border-strong bg-background/95 backdrop-blur">
        <DotStrip />
        <ul className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`tap flex flex-col items-center gap-1.5 py-3 transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Icon />
                  <span className="label-tech !text-[9px] text-inherit">{label}</span>
                  <span
                    aria-hidden
                    className={`h-[3px] w-3 ${active ? "bg-primary" : "bg-transparent"}`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function ScreenHeader({
  title,
  meta,
  right,
}: {
  title: string;
  meta?: string;
  right?: ReactNode;
}) {
  return (
    <header className="border-b border-border px-5 pb-4 pt-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          {meta && <span className="label-tech mb-2 block">{meta}</span>}
          <h1 className="text-xl font-semibold uppercase tracking-[0.12em]">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  );
}

/* -------- geometric thin-stroke icons -------- */

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.2 } as const;

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...S}>
      <path d="M2.5 7.5 9 2.5l6.5 5v8h-13v-8Z" />
      <path d="M7 15.5v-5h4v5" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...S}>
      <path d="M2.5 4.5h13M2.5 9h13M2.5 13.5h13" />
    </svg>
  );
}
function BudgetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...S}>
      <rect x="2.5" y="2.5" width="13" height="13" />
      <path d="M2.5 11.5h8" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...S}>
      <path d="M3 15.5V8M7.5 15.5V3M12 15.5v-6M16 15.5v-3" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...S}>
      <circle cx="9" cy="9" r="3" />
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M14.3 3.7l-1.4 1.4M5.1 12.9l-1.4 1.4" />
    </svg>
  );
}
