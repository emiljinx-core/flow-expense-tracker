import { useEffect, useRef, useState, type ReactNode } from "react";

/* ---------------- Technical label ---------------- */

export function TechLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`label-tech block ${className}`}>{children}</span>;
}

/* ---------------- Dot matrix strip ---------------- */

export function DotStrip({ accent = false, className = "" }: { accent?: boolean; className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-[6px] w-full ${accent ? "dot-grid-red" : "dot-grid"} opacity-70 ${className}`}
    />
  );
}

/* ---------------- Panel (sharp geometric card) ---------------- */

export function Panel({
  children,
  className = "",
  label,
  action,
}: {
  children?: ReactNode;
  className?: string;
  label?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`panel relative ${className}`}>
      {(label || action) && (
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          {label ? <TechLabel>{label}</TechLabel> : <span />}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ---------------- Buttons ---------------- */

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger" | "solid";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  full?: boolean;
  "aria-label"?: string;
};

export function Btn({
  children,
  onClick,
  variant = "outline",
  className = "",
  type = "button",
  disabled,
  full,
  ...rest
}: BtnProps) {
  const base =
    "tap inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] transition-all duration-150 active:translate-y-[1px] disabled:opacity-40 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    solid: "bg-foreground text-background hover:bg-foreground/90",
    outline: "border border-border-strong text-foreground hover:bg-surface-2",
    ghost: "text-muted-foreground hover:text-foreground",
    danger: "border border-primary text-primary hover:bg-primary hover:text-primary-foreground",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- Amount with count-up animation ---------------- */

export function Amount({
  value,
  size = "md",
  prefix = "₹",
  animate = true,
  className = "",
}: {
  value: number;
  size?: "sm" | "md" | "lg" | "xl";
  prefix?: string;
  animate?: boolean;
  className?: string;
}) {
  const [display, setDisplay] = useState(animate ? value : value);
  const prev = useRef(value);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      return;
    }
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    const start = performance.now();
    const duration = 520;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, animate]);

  const sizes = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-5xl",
  } as const;

  return (
    <span className={`num ${sizes[size]} font-medium ${className}`}>
      {prefix}
      {Math.round(display).toLocaleString("en-IN")}
    </span>
  );
}

/* ---------------- Bottom sheet ---------------- */

export function Sheet({
  open,
  onClose,
  title,
  meta,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-background/80 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet-in relative flex max-h-[92vh] w-full max-w-md flex-col border-t border-border-strong bg-popover shadow-panel"
      >
        <DotStrip />
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">{title}</h2>
            {meta && <p className="label-tech mt-1.5">{meta}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Dismiss"
            className="tap -mr-2 -mt-2 flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </header>
        <div className="scrollbar-none overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Form fields ---------------- */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <TechLabel className="mb-2">{label}</TechLabel>
      {children}
      {hint && <span className="label-tech mt-1.5 block normal-case tracking-normal">{hint}</span>}
    </label>
  );
}

const inputClass =
  "tap w-full border border-input bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
  disabled,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  disabled?: boolean;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} ${mono ? "num" : ""} disabled:opacity-60`}
    />
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-px border border-input bg-input">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`tap flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 text-xs uppercase tracking-[0.14em] transition-colors ${
              active
                ? "bg-foreground font-semibold text-background"
                : "bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{o.label}</span>
            {o.hint && <span className="num text-[10px] tracking-normal opacity-70">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const active = c === value;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={active}
            className={`border px-3 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors ${
              active
                ? "border-primary bg-primary/15 font-semibold text-foreground"
                : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
            }`}
          >
            {active && <span className="mr-1.5 inline-block h-1.5 w-1.5 bg-primary align-middle" />}
            {c}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Progress (color-independent) ---------------- */

export function Progress({ pct, over }: { pct: number; over?: boolean }) {
  const segments = 20;
  const filled = Math.round((Math.min(100, pct) / 100) * segments);
  return (
    <div className="flex gap-[3px]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className={`h-3 flex-1 transition-colors duration-300 ${
            i < filled ? (over ? "bg-primary" : "bg-foreground") : "bg-surface-2"
          }`}
        />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div aria-hidden className="dot-grid h-8 w-16 opacity-60" />
      <p className="text-sm font-medium uppercase tracking-[0.14em]">{title}</p>
      {hint && <p className="max-w-[26ch] text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}
