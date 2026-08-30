import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { registerPlugin } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { jsPDF } from "jspdf";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { Btn, EmptyState, Field, Panel, Segmented, TechLabel, TextInput } from "@/components/nothing/ui";
import { useStore } from "@/lib/store";
import { dateTimeLabel, rupee, formatINR } from "@/lib/format";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { checkNotificationPermission, checkOverlayPermission, openNotificationSettings, openOverlaySettings } from "@/lib/plugins/NotificationBridge";
import type { NotificationBridgePlugin } from "@/lib/plugins/NotificationBridge";

const NotificationBridge = registerPlugin<NotificationBridgePlugin>("NotificationBridge");

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings, backup, restore & export — LEDGER" },
      {
        name: "description",
        content:
          "Control notification monitoring, manage categories, create a JSON backup, restore with a merge preview, and export expenses as CSV, PDF, or a printable report.",
      },
      { property: "og:title", content: "Settings, backup, restore & export — LEDGER" },
      {
        property: "og:description",
        content: "Notification permissions, categories, JSON backup with merge-preview restore, and exports.",
      },
    ],
  }),
  component: Settings,
});

const MONITORABLE = ["GPay", "Messages",  "HDFC Bank", "SBI", "Paytm", "PhonePe"];

async function download(name: string, content: string, type: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.writeFile({
        path: name,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: name,
        url: result.uri,
        dialogTitle: "Export Expenses",
      });
    } catch (e) {
      console.error("Failed to export on native device", e);
    }
  } else {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function Settings() {
  const { state, updateSettings, addCategory, removeCategory, exportBackup, previewRestore, confirmRestore, resetToSeed, clearAll } =
    useStore();
  const [newCategory, setNewCategory] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReturnType<typeof previewRestore> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [hasNotificationAccess, setHasNotificationAccess] = useState(state.settings.detectionEnabled);
  const [hasOverlayAccess, setHasOverlayAccess] = useState(state.settings.overlayPermission);

  useEffect(() => {
    async function syncPermissions() {
      if (!Capacitor.isNativePlatform()) return;
      const notif = await checkNotificationPermission();
      const overlay = await checkOverlayPermission();
      setHasNotificationAccess(notif);
      setHasOverlayAccess(overlay);
      
      // Update global store based on native truth
      updateSettings({ detectionEnabled: notif, overlayPermission: overlay });
    }
    
    // Sync on mount and when returning to app (if they went to settings and back)
    syncPermissions();
    const interval = setInterval(syncPermissions, 2000); // Polling for simplicity when testing
    return () => clearInterval(interval);
  }, []);

  // export filters
  const [exportCategory, setExportCategory] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [format, setFormat] = useState<"csv" | "pdf">("csv");

  const fromBound = from ? `${from}T${fromTime || "00:00"}` : "";
  const toBound = to ? `${to}T${toTime || "23:59"}` : "";

  const exportRows = state.expenses.filter((e) => {
    const ts = e.createdAt;

    return (
      (exportCategory === "All" || e.category === exportCategory) &&
      (!fromBound || ts >= fromBound) &&
      (!toBound || ts <= toBound)
    );
  });

  const runExport = async () => {
    if (!exportRows.length) {
      setError("No expenses match the selected filters.");
      return;
    }
    setError(null);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      const header = "Date,Time,Amount,Person,Category,Description,Source";
      const lines = exportRows.map((e) => {
        const d = new Date(e.createdAt);
        return [
          d.toLocaleDateString("en-IN"),
          d.toLocaleTimeString("en-IN"),
          e.amount,
          `"${e.person.replace(/"/g, '""')}"`,
          e.category,
          `"${e.description.replace(/"/g, '""')}"`,
          e.source,
        ].join(",");
      });
      await download(`expenses-${stamp}.csv`, [header, ...lines].join("\n"), "text/csv");
    } else if (format === "pdf") {
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const pageH = doc.internal.pageSize.getHeight();
      let y = 56;

      doc.setFont("courier", "bold");
      doc.setFontSize(16);
      doc.text("LEDGER — EXPENSE EXPORT", 40, y);

      doc.setFont("courier", "normal");
      doc.setFontSize(9);

      y += 18;
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 40, y);
      y += 22;

      doc.setFont("courier", "bold");
      doc.text("DATE", 40, y);
      doc.text("AMOUNT", 130, y);
      doc.text("PERSON", 200, y);
      doc.text("CATEGORY", 320, y);
      doc.text("DESCRIPTION", 410, y);

      doc.setFont("courier", "normal");
      y += 6;
      doc.line(40, y, 555, y);
      y += 14;

      for (const e of exportRows) {
        if (y > pageH - 80) {
          doc.addPage();
          y = 56;
        }

        const d = new Date(e.createdAt);

        doc.text(d.toLocaleDateString("en-IN"), 40, y);
        doc.text(formatINR(e.amount), 130, y);
        doc.text(e.person.slice(0, 16) || "—", 200, y);
        doc.text(e.category.slice(0, 12), 320, y);
        doc.text((e.description || "—").slice(0, 22), 410, y);

        y += 14;
      }

      const total = exportRows.reduce((t, e) => t + e.amount, 0);

      if (y > pageH - 70) {
        doc.addPage();
        y = 56;
      }

      y += 6;
      doc.line(40, y, 555, y);
      y += 18;

      doc.setFont("courier", "bold");
      doc.setFontSize(12);
      doc.text(`TOTAL EXPENSE: INR ${formatINR(total)}`, 40, y);

      const pdfData = doc.output("datauristring").split(",")[1];

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: `expenses-${stamp}.pdf`,
          data: pdfData,
          directory: Directory.Cache,
        });

        await Share.share({
          title: `expenses-${stamp}.pdf`,
          url: result.uri,
          dialogTitle: "Export Expenses",
        });
      } else {
        doc.save(`expenses-${stamp}.pdf`);
      }
    }
    setStatus(`Exported ${exportRows.length} expenses (${rupee(exportRows.reduce((t, e) => t + e.amount, 0))}).`);
  } catch (err) {
    console.error("Export error:", err);
    setError("Export failed: " + (err instanceof Error ? err.message : String(err)));
  }
};

  const handleRestoreFile = async (file: File) => {
    try {
      const text = await file.text();
      setPreview(previewRestore(text));
      setError(null);
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? `Restore failed — ${e.message}` : "Restore failed — invalid backup file.");
    }
  };

  return (
    <AppShell>
      <ScreenHeader title="Settings" meta="LOCAL-FIRST · NO ACCOUNT REQUIRED" />

      <div className="space-y-4 p-5">
        <Panel label="Automatic detection">
          <div className="space-y-4 p-4">
            <Toggle
              label="Notification access"
              hint="Required to read payment notifications. Manual entry always works without it."
              value={hasNotificationAccess}
              onChange={async () => {
                if (Capacitor.isNativePlatform()) {
                  await openNotificationSettings();
                } else {
                  setHasNotificationAccess(prev => !prev);
                  updateSettings({ detectionEnabled: !hasNotificationAccess });
                }
              }}
            />
            <Toggle
              label="Overlay permission"
              hint="Allows the transaction overlay to appear above other apps."
              value={hasOverlayAccess}
              onChange={async () => {
                if (Capacitor.isNativePlatform()) {
                  await openOverlaySettings();
                } else {
                  setHasOverlayAccess(prev => !prev);
                  updateSettings({ overlayPermission: !hasOverlayAccess });
                }
              }}
            />
            <Field label="Monitored sources">
              <Segmented
                value={state.settings.monitorAllApps ? "all" : "selected"}
                onChange={(v) => updateSettings({ monitorAllApps: v === "all" })}
                options={[
                  { value: "all", label: "All apps" },
                  { value: "selected", label: "Selected" },
                ]}
              />
            </Field>
            {!state.settings.monitorAllApps && (
              <div className="flex flex-wrap gap-2">
                {MONITORABLE.map((app) => {
                  const on = state.settings.monitoredApps.includes(app);
                  return (
                    <button
                      key={app}
                      onClick={() =>
                        updateSettings({
                          monitoredApps: on
                            ? state.settings.monitoredApps.filter((a) => a !== app)
                            : [...state.settings.monitoredApps, app],
                        })
                      }
                      aria-pressed={on}
                      className={`border px-3 py-2 text-[11px] uppercase tracking-[0.12em] transition-colors ${
                        on
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {on ? "■ " : "□ "}
                      {app}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        <Panel label="Categories">
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
              {state.categories.map((c) => (
                <span
                  key={c}
                  className="flex items-center gap-2 border border-border px-3 py-2 text-[11px] uppercase tracking-[0.12em]"
                >
                  {c}
                  {!DEFAULT_CATEGORIES.includes(c) && (
                    <button
                      onClick={() => removeCategory(c)}
                      aria-label={`Remove ${c}`}
                      className="text-muted-foreground hover:text-primary"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <TextInput value={newCategory} onChange={setNewCategory} placeholder="Custom category" />
              <Btn
                onClick={() => {
                  addCategory(newCategory);
                  setNewCategory("");
                }}
              >
                Add
              </Btn>
            </div>
          </div>
        </Panel>

        <Panel label="Backup & restore">
          <div className="space-y-4 p-4">
            <div>
              <TechLabel>Backup location</TechLabel>
              <p className="num mt-1.5 text-xs text-muted-foreground">{state.settings.backupLocation}</p>
            </div>
            <Toggle
              label="Automatic backup"
              hint="Creates a JSON backup periodically in the selected location."
              value={state.settings.autoBackup}
              onChange={async (v) => {
                updateSettings({ autoBackup: v });
                if (Capacitor.isNativePlatform()) {
                  if (v) {
                    await NotificationBridge.scheduleBackup({ frequencyHours: 24 });
                  } else {
                    await NotificationBridge.cancelBackup();
                  }
                }
              }}
            />
            <div className="flex gap-2">
              <Btn
                className="flex-1"
                onClick={async () => {
                  await download(`ledger-backup-${new Date().toISOString().slice(0, 10)}.json`, exportBackup(), "application/json");
                  setStatus("Backup created.");
                  setError(null);
                }}
              >
                Create backup
              </Btn>
              <Btn className="flex-1" onClick={() => fileRef.current?.click()}>
                Restore backup
              </Btn>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleRestoreFile(file);
                e.target.value = "";
              }}
            />
            <p className="label-tech normal-case tracking-normal">
              {state.settings.lastBackupAt
                ? `Last backup: ${dateTimeLabel(state.settings.lastBackupAt)}`
                : "No backup created yet."}
            </p>

            {preview && (
              <div className="border border-border-strong bg-surface-2 p-4">
                <TechLabel>Restore preview · merge, nothing deleted</TechLabel>
                <dl className="mt-3 space-y-1.5 text-xs">
                  <PreviewRow label="New transactions" value={String(preview.newExpenses)} />
                  <PreviewRow label="Already existing" value={String(preview.existingExpenses)} />
                  <PreviewRow label="New credits" value={String(preview.newCredits)} />
                  <PreviewRow label="New categories" value={String(preview.newCategories)} />
                  <PreviewRow label="Existing categories" value={String(preview.existingCategories)} />
                  <PreviewRow label="Budget data" value={preview.budgetAvailable ? "Available" : "None"} />
                </dl>
                <div className="mt-4 flex gap-2">
                  <Btn variant="ghost" className="flex-1" onClick={() => setPreview(null)}>
                    Cancel
                  </Btn>
                  <Btn
                    variant="primary"
                    className="flex-1"
                    onClick={async () => {
                      await confirmRestore(preview);
                      setPreview(null);
                      setStatus("Backup merged into current data.");
                    }}
                  >
                    Confirm restore
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </Panel>

        <Panel label="Export expenses">
          <div className="space-y-4 p-4">
            <Field label="Category">
              <select
                value={exportCategory}
                onChange={(e) => setExportCategory(e.target.value)}
                className="tap w-full border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {["All", ...state.categories].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="num tap w-full border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="To">
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="num tap w-full border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From time">
                <input
                  type="time"
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value)}
                  className="num tap w-full border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>

              <Field label="To time">
                <input
                  type="time"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                  className="num tap w-full border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>
            </div>
            <Field label="Format">
              <Segmented
                value={format}
                onChange={setFormat}
                options={[
                  { value: "csv", label: "CSV / Excel" },
                  { value: "pdf", label: "PDF" },
                ]}
              />
            </Field>
            <p className="label-tech normal-case tracking-normal">
              {exportRows.length} expenses match · {rupee(exportRows.reduce((t, e) => t + e.amount, 0))}
            </p>
            <Btn variant="solid" full onClick={runExport}>
              Export
            </Btn>
          </div>
        </Panel>

        <Panel label="Prototype data">
          <div className="space-y-3 p-4">
              <Btn variant="danger" className="w-full" onClick={async () => {
                try {
                  await clearAll();
                  setStatus("All data cleared.");
                  setError(null);
                } catch (e) {
                  setError("Failed to clear data.");
                  setStatus(null);
                }
              }}>
                Clear all data
              </Btn>

            <p className="label-tech normal-case tracking-normal">
              Data is stored locally on this device only. No account, no server.
            </p>
          </div>
        </Panel>

        {(status || error) && (
          <p
            className={`border px-3 py-2.5 text-xs uppercase tracking-[0.12em] ${
              error ? "border-primary text-primary" : "border-border-strong text-foreground"
            }`}
          >
            {error ? `! ${error}` : `✓ ${status}`}
          </p>
        )}

        {!state.expenses.length && (
          <Panel>
            <EmptyState title="No expenses stored" hint="Add an expense from Home to populate history, budget, and insights." />
          </Panel>
        )}
      </div>
    </AppShell>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-1.5 last:border-0">
      <TechLabel>{label}</TechLabel>
      <dd className="num">{value}</dd>
    </div>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex-1">
        <span className="block text-sm">{label}</span>
        {hint && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{hint}</span>}
      </span>
      <button
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`tap flex h-8 w-16 shrink-0 items-center border px-1 transition-colors ${
          value ? "border-primary bg-primary/20" : "border-border-strong bg-surface"
        }`}
      >
        <span
          className={`flex h-5 flex-1 items-center justify-center text-[9px] font-semibold uppercase tracking-[0.1em] transition-transform duration-200 ${
            value ? "translate-x-[26px] bg-primary text-primary-foreground" : "bg-border-strong text-background"
          }`}
          style={{ width: 24, flex: "none" }}
        >
          {value ? "ON" : "OFF"}
        </span>
      </button>
    </div>
  );
}
