import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { PaymentSource, TransactionCandidate } from "@/lib/types";
import { timeLabel } from "@/lib/format";
import { Btn, CategoryPicker, DotStrip, Field, Segmented, TechLabel, TextInput } from "./nothing/ui";

/* Mock notification pool — stands in for NotificationListenerService */
const POOL: Omit<TransactionCandidate, "id" | "detectedAt">[] = [
  {
    type: "debit",
    amount: 500,
    counterparty: "Rahul",
    sourceApp: "GPay",
    suggestedCategory: "Food",
    suggestedDescription: "Dinner",
    raw: "You paid ₹500.00 to Rahul using Google Pay",
  },
  {
    type: "debit",
    amount: 350,
    counterparty: "Swiggy",
    sourceApp: "GPay",
    suggestedCategory: "Food",
    suggestedDescription: "Food order",
    raw: "₹350 debited for SWIGGY INSTAMART UPI/ P2M",
  },
  {
    type: "debit",
    amount: 500,
    counterparty: null,
    sourceApp: "Samsung Messages",
    raw: "A/c XX4412 debited ₹500 on 17-Aug UPI Ref 4409281",
  },
  {
    type: "credit",
    amount: 5000,
    counterparty: "Employer",
    sourceApp: "HDFC Bank",
    suggestedDescription: "Salary",
    raw: "A/c XX4412 credited ₹5,000.00 NEFT SALARY",
  },
];

function candidateId() {
  return `cand_${Math.random().toString(36).slice(2, 9)}`;
}

export function TransactionOverlay({
  candidate,
  onDismiss,
}: {
  candidate: TransactionCandidate | null;
  onDismiss: () => void;
}) {
  const { state, addExpense, addCredit } = useStore();
  const [amount, setAmount] = useState("0");
  const [person, setPerson] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<PaymentSource>("account");

  useEffect(() => {
    if (!candidate) return;
    setAmount("");
    setPerson("");
    setCategory(candidate.suggestedCategory ?? state.categories[0] ?? "Food");
    setDescription("");
    setSource("account");
  }, [candidate, state.categories]);

  const duplicate = useMemo(() => {
    if (!candidate) return false;
    const window = 3 * 60 * 1000;
    return state.expenses.some(
      (e) =>
        e.amount === candidate.amount &&
        Math.abs(new Date(e.createdAt).getTime() - new Date(candidate.detectedAt).getTime()) < window,
    );
  }, [candidate, state.expenses]);

  if (!candidate) return null;

  const isCredit = candidate.type === "credit";
  const unknownReceiver = candidate.counterparty == null;

  const save = () => {
    const value = Number(amount) || candidate.amount;
    if (isCredit) {
      addCredit({
        amount: value,
        target: source,
        note: description.trim() || candidate.suggestedDescription || "Credit",
        origin: "detected",
        sourceApp: candidate.sourceApp,
        createdAt: candidate.detectedAt,
      });
    } else {
      addExpense({
        amount: value,
        person: person.trim() || candidate.counterparty || "Unknown",
        category,
        description: description.trim() || candidate.suggestedDescription || "",
        source,
        origin: "detected",
        sourceApp: candidate.sourceApp,
        createdAt: candidate.detectedAt,
      });
    }
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-6">
      <button
        aria-label="Dismiss overlay"
        onClick={onDismiss}
        className="absolute inset-0 animate-fade-in bg-background/70 backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isCredit ? "Credit detected" : "Debit detected"}
        className="animate-overlay-in relative w-full max-w-md border border-border-strong bg-popover shadow-panel"
      >
        <DotStrip accent={!isCredit} />

        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <TechLabel>{candidate.sourceApp} · NOTIFICATION</TechLabel>
          <TechLabel>{isCredit ? "CREDIT" : "DEBIT"}</TechLabel>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-baseline gap-3">
            <span className="num text-4xl font-medium">
              ₹{candidate.amount.toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {isCredit ? "credited" : "debited"}
            </span>
          </div>

          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            {!isCredit && (
              <div className="flex justify-between gap-4">
                <TechLabel>To</TechLabel>
                <dd className={unknownReceiver ? "text-muted-foreground" : ""}>
                  {unknownReceiver ? "UNKNOWN — NOT IN NOTIFICATION" : candidate.counterparty}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <TechLabel>Time</TechLabel>
              <dd className="num text-xs">
                {timeLabel(candidate.detectedAt)} <span className="label-tech ml-1 inline">LOCKED</span>
              </dd>
            </div>
          </dl>

          {duplicate && (
            <p className="mt-4 border border-border-strong bg-surface px-3 py-2 text-xs leading-relaxed">
              <span className="label-tech mb-1 block">Possible duplicate</span>A similar amount was
              recorded moments ago. Dismiss if this notification is the same transaction.
            </p>
          )}

          <div className="mt-5 space-y-4 border-t border-border pt-5">
            <TechLabel>{isCredit ? "Where should this go?" : "What was this for?"}</TechLabel>

            <Field label="Amount (editable)">
              <TextInput
                value={amount}
                onChange={(v) => setAmount(v.replace(/[^\d.]/g, ""))}
                placeholder={String(candidate.amount)}
                inputMode="decimal"
                mono
              />
            </Field>

            {!isCredit && (
              <>
                <Field label="Person / receiver">
                  <TextInput
                    value={person}
                    onChange={setPerson}
                    placeholder={candidate.counterparty || "Enter receiver"}
                  />
                </Field>
                <Field label="Category">
                  <CategoryPicker
                    categories={state.categories}
                    value={category}
                    onChange={setCategory}
                  />
                </Field>
              </>
            )}

            <Field label={isCredit ? "Source / note" : "Description"}>
              <TextInput
                value={description}
                onChange={setDescription}
                placeholder={candidate.suggestedDescription || (isCredit ? "Salary" : "Enter reason")}
              />
            </Field>

            <Field label={isCredit ? "Add to" : "Payment type"}>
              <Segmented
                value={source}
                onChange={setSource}
                options={[
                  { value: "account", label: "Account" },
                  { value: "cash", label: "Cash" },
                ]}
              />
            </Field>
          </div>

          <div className="mt-5 flex gap-2">
            <Btn variant="ghost" onClick={onDismiss} className="flex-1">
              Dismiss
            </Btn>
            <Btn variant={isCredit ? "solid" : "primary"} onClick={save} className="flex-[2]">
              Save
            </Btn>
          </div>
          <p className="label-tech mt-3 normal-case tracking-normal">
            Nothing is saved until you confirm. Date and time stay as detected.
          </p>
        </div>
      </div>
    </div>
  );
}
