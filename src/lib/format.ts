export function formatINR(amount: number, opts?: { decimals?: boolean }) {
  const value = opts?.decimals ? amount : Math.round(amount);
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  });
}

export function rupee(amount: number) {
  return `₹${formatINR(amount)}`;
}

export function monthKey(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const parts = key.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  return new Date(y, m - 1, 1)
    .toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    .toUpperCase();
}

export function dayKey(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function timeLabel(iso: string) {
  return new Date(iso)
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    .toUpperCase();
}

export function dateTimeLabel(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}, ${timeLabel(iso)}`;
}

export function dayHeading(iso: string) {
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  const key = dayKey(iso);
  if (key === today) return "TODAY";
  if (key === yesterday) return "YESTERDAY";
  return new Date(iso)
    .toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })
    .toUpperCase();
}
