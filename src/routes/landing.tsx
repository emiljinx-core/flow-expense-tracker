import { createFileRoute, Link } from "@tanstack/react-router";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "flow. — See your money move" },
      {
        name: "description",
        content:
          "flow. is a local-first expense tracker for UPI and cash. See your money move — balances, budgets and reasons, in one dark technical interface.",
      },
      { property: "og:title", content: "flow. — See your money move" },
      {
        property: "og:description",
        content:
          "A dark, technical expense tracker for UPI and cash. See your money move.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-md flex-col overflow-hidden border-x border-border bg-background px-6 py-6">
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
        )}
      />
      {/* top status rail */}
      <div className="flex items-center justify-between">
        <span className="label-tech">LEDGER · INR</span>
        <span className="label-tech flex items-center gap-2">
          <span aria-hidden className="animate-pulse-dot block h-1.5 w-1.5 bg-primary" />
          LOCAL
        </span>
      </div>

      {/* wordmark */}
      <main className="flex flex-1 flex-col items-center justify-center">
        <h1 className="animate-rise-in flex items-end font-mono text-6xl font-bold tracking-tight lowercase">
          flow
          <span aria-hidden className="ml-1.5 mb-2 block h-3 w-3 bg-primary" />
        </h1>
        <p
          className="label-tech animate-rise-in mt-6 text-center !tracking-[0.32em]"
          style={{ animationDelay: "120ms" }}
        >
          See your money move.
        </p>
      </main>

      {/* footer */}
      <footer className="mt-auto pb-9">
        <Link
          to="/"
          className="tap flex items-center justify-center gap-2 bg-primary px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground ring-1 ring-inset ring-white transition-opacity active:opacity-80"
        >
          Enter ledger <span aria-hidden>→</span>
        </Link>
      </footer>
    </div>
  );
}
