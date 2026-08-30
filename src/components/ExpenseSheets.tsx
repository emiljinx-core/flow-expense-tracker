import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Expense, PaymentSource } from "@/lib/types";
import { dateTimeLabel, rupee } from "@/lib/format";
import {
  Amount,
  Btn,
  CategoryPicker,
  Field,
  Segmented,
  Sheet,
  TechLabel,
  TextInput,
} from "./nothing/ui";
import { computeBalances } from "@/lib/store";

/* ------------------------------------------------------------------ */
/* Add expense — bottom sheet, fast entry                              */
/* ------------------------------------------------------------------ */

export function AddExpenseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, addExpense, addCategory } = useStore();
  const [amount, setAmount] = useState("");
  const [person, setPerson] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<PaymentSource>("account");
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (open) {
      setCapturedAt(new Date().toISOString());
      setError(null);
    }
  }, [open]);

  const reset = () => {
    setAmount("");
    setPerson("");
    setDescription("");
    setCategory("Food");
    setSource("account");
    setNewCategory("");
  };

  const submit = () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    addExpense({
      amount: value,
      person: person.trim() || "Unknown",
      category,
      description: description.trim(),
      source,
      origin: "manual",
      createdAt: capturedAt,
    });
    reset();
    onClose();
  };

  const balances = computeBalances(state);

  return (
    <Sheet open={open} onClose={onClose} title="Add expense" meta={`CAPTURED · ${dateTimeLabel(capturedAt)}`}>
      <div className="space-y-5">
        <Field label="Amount (INR)">
          <TextInput
            value={amount}
            onChange={(v) => setAmount(v.replace(/[^\d.]/g, ""))}
            placeholder="0"
            inputMode="decimal"
            mono
          />
        </Field>

        <Field label="Person / receiver">
          <TextInput value={person} onChange={setPerson} placeholder="Rahul, Swiggy, Auto stand…" />
        </Field>

        <Field label="Category">
          <CategoryPicker categories={state.categories} value={category} onChange={setCategory} />
        </Field>

        <div className="flex gap-2">
          <TextInput value={newCategory} onChange={setNewCategory} placeholder="New category" />
          <Btn
            onClick={() => {
              if (!newCategory.trim()) return;
              addCategory(newCategory);
              setCategory(newCategory.trim());
              setNewCategory("");
            }}
          >
            Add
          </Btn>
        </div>

        <Field label="Description / reason">
          <TextInput value={description} onChange={setDescription} placeholder="Dinner with team" />
        </Field>

        <Field label="Payment source">
          <Segmented
            value={source}
            onChange={setSource}
            options={[
              { value: "account", label: "Account", hint: rupee(balances.account) },
              { value: "cash", label: "Cash", hint: rupee(balances.cash) },
            ]}
          />
        </Field>

        {error && (
          <p className="border border-primary px-3 py-2 text-xs uppercase tracking-[0.12em] text-primary">
            ! {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Btn variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Btn>
          <Btn variant="primary" onClick={submit} className="flex-[2]">
            Save expense
          </Btn>
        </div>
        <p className="label-tech normal-case tracking-normal">
          Date and time are captured automatically and locked after saving.
        </p>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Add amount (credit)                                                 */
/* ------------------------------------------------------------------ */

export function AddAmountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addCredit } = useStore();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState<PaymentSource>("account");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    addCredit({ amount: value, target, note: note.trim() || "Added manually", origin: "manual" });
    setAmount("");
    setNote("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add amount" meta="CREDIT ENTRY">
      <div className="space-y-5">
        <Field label="Amount (INR)">
          <TextInput
            value={amount}
            onChange={(v) => setAmount(v.replace(/[^\d.]/g, ""))}
            placeholder="0"
            inputMode="decimal"
            mono
          />
        </Field>
        <Field label="Add to">
          <Segmented
            value={target}
            onChange={setTarget}
            options={[
              { value: "account", label: "Account" },
              { value: "cash", label: "Cash" },
            ]}
          />
        </Field>
        <Field label="Source / note">
          <TextInput value={note} onChange={setNote} placeholder="Salary, refund, transfer…" />
        </Field>
        {error && (
          <p className="border border-primary px-3 py-2 text-xs uppercase tracking-[0.12em] text-primary">
            ! {error}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <Btn variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Btn>
          <Btn variant="solid" onClick={submit} className="flex-[2]">
            Save credit
          </Btn>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Expense details + edit + delete                                     */
/* ------------------------------------------------------------------ */

export function ExpenseDetailsSheet({
  expense,
  onClose,
}: {
  expense: Expense | null;
  onClose: () => void;
}) {
  const { state, updateExpense, deleteExpense } = useStore();
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [amount, setAmount] = useState("");
  const [person, setPerson] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<PaymentSource>("account");

  useEffect(() => {
    if (!expense) return;
    setMode("view");
    setAmount(String(expense.amount));
    setPerson(expense.person);
    setCategory(expense.category);
    setDescription(expense.description);
    setSource(expense.source);
  }, [expense]);

  if (!expense) return null;

  const save = () => {
    const value = Number(amount);
    if (!value || value <= 0) return;
    updateExpense(expense.id, {
      amount: value,
      person: person.trim() || "Unknown",
      category,
      description: description.trim(),
      source,
    });
    onClose();
  };

  return (
    <Sheet
      open={!!expense}
      onClose={onClose}
      title={mode === "edit" ? "Edit expense" : "Expense details"}
      meta={`${expense.origin === "detected" ? `DETECTED · ${expense.sourceApp ?? "UNKNOWN APP"}` : "MANUAL ENTRY"}`}
    >
      {mode === "view" && (
        <div className="space-y-5">
          <div className="border border-border bg-surface p-5">
            <Amount value={expense.amount} size="xl" animate={false} />
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Person" value={expense.person} />
              <Row label="Category" value={expense.category} accent />
              <Row label="Description" value={expense.description || "—"} />
              <Row label="Date / time" value={dateTimeLabel(expense.createdAt)} locked />
              <Row label="Paid from" value={expense.source === "account" ? "Account" : "Cash"} />
            </div>
          </div>
          <div className="flex gap-2">
            <Btn onClick={() => setMode("edit")} className="flex-1">
              Edit
            </Btn>
            <Btn variant="danger" onClick={() => setMode("confirm-delete")} className="flex-1">
              Delete
            </Btn>
          </div>
        </div>
      )}

      {mode === "edit" && (
        <div className="space-y-5">
          <Field label="Amount (INR)">
            <TextInput
              value={amount}
              onChange={(v) => setAmount(v.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              mono
            />
          </Field>
          <Field label="Person / receiver">
            <TextInput value={person} onChange={setPerson} />
          </Field>
          <Field label="Category">
            <CategoryPicker categories={state.categories} value={category} onChange={setCategory} />
          </Field>
          <Field label="Description">
            <TextInput value={description} onChange={setDescription} />
          </Field>
          <Field label="Payment source" hint="Switching source moves the amount between balances.">
            <Segmented
              value={source}
              onChange={setSource}
              options={[
                { value: "account", label: "Account" },
                { value: "cash", label: "Cash" },
              ]}
            />
          </Field>
          <Field label="Date / time (locked)">
            <TextInput value={dateTimeLabel(expense.createdAt)} onChange={() => {}} disabled mono />
          </Field>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setMode("view")} className="flex-1">
              Cancel
            </Btn>
            <Btn variant="primary" onClick={save} className="flex-[2]">
              Save changes
            </Btn>
          </div>
        </div>
      )}

      {mode === "confirm-delete" && (
        <div className="space-y-5">
          <div className="border border-primary bg-primary/10 p-5">
            <TechLabel>Confirm deletion</TechLabel>
            <p className="mt-3 text-sm leading-relaxed">
              {rupee(expense.amount)} — {expense.person} will be removed and the amount returned to your{" "}
              {expense.source === "account" ? "Account" : "Cash"} balance.
            </p>
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setMode("view")} className="flex-1">
              Cancel
            </Btn>
            <Btn
              variant="primary"
              className="flex-1"
              onClick={() => {
                deleteExpense(expense.id);
                onClose();
              }}
            >
              Delete
            </Btn>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export function Row({
  label,
  value,
  accent,
  locked,
}: {
  label: string;
  value: string;
  accent?: boolean;
  locked?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <TechLabel>{label}</TechLabel>
      <span className={`text-right text-sm ${accent ? "text-foreground" : "text-foreground/90"}`}>
        {accent && <span className="mr-1.5 inline-block h-1.5 w-1.5 bg-primary align-middle" />}
        {value}
        {locked && <span className="label-tech ml-2 inline">LOCKED</span>}
      </span>
    </div>
  );
}
