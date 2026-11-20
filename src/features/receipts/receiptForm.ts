/*
 * Estado del modal de confirmación de boletas: valores iniciales desde la lectura,
 * validación (data-model.md § Validaciones) y armado de ConfirmReceiptInput.
 * Puro y probado (receiptForm.test.ts).
 */
import type { ReceiptAnalysis } from "./queries";

export const NEW_ACCOUNT = "__new__";

export interface ReceiptFormState {
  accountId: string; // id de cuenta existente o NEW_ACCOUNT
  newAccountName: string;
  year: number | "";
  month: number | "";
  amount: string; // con separador de miles, como el resto de la app
  status: "NOT_CONFIRMED" | "CONFIRMED" | "PAID";
  dueDate: string; // yyyy-mm-dd o ""
}

export interface FormFlags {
  /** Campos detectados con baja seguridad: se destacan para revisión (FR-006) */
  review: Partial<Record<keyof ReceiptFormState, boolean>>;
  /** Se propuso el monto sin saldo anterior porque el mes ya tiene arrastre (FR-013a) */
  carriedAdjusted: boolean;
}

export const formatThousands = (n: number) => new Intl.NumberFormat("es-CL").format(Math.round(n));
export const parseThousands = (s: string) => Number(s.replace(/\./g, "").replace(/,/g, ""));

export function initialForm(a: ReceiptAnalysis): { form: ReceiptFormState; flags: FormFlags } {
  const top = a.accountSuggestions[0];
  const existing = a.duplicate?.existingAmount;
  const carriedAdjusted = Boolean(
    existing && Number(existing.carried_amount) > 0 && Number(a.previousBalance) > 0 && a.totalWithoutPreviousBalance
  );
  const amount = carriedAdjusted ? a.totalWithoutPreviousBalance! : a.total ?? null;

  return {
    form: {
      accountId: top?.account.id ?? "",
      newAccountName: "",
      year: a.proposedYear ?? "",
      month: a.proposedMonth ?? "",
      amount: amount !== null ? formatThousands(amount) : "",
      status: "CONFIRMED", // FR-009: "Por pagar"
      dueDate: a.dueDate ?? "",
    },
    flags: {
      review: {
        accountId: !top || top.confidence !== "HIGH",
        month: !a.proposedMonth || a.monthConfidence !== "HIGH",
        year: !a.proposedYear || a.monthConfidence !== "HIGH",
        amount: a.totalConfidence !== "HIGH" || carriedAdjusted || Number(a.previousBalance) > 0,
      },
      carriedAdjusted,
    },
  };
}

export type FieldError = "required" | "yearRange" | "invalid";

export interface Validation {
  errors: Partial<Record<keyof ReceiptFormState, FieldError>>;
  /** Mes a más de 12 meses del actual: se advierte pero se permite */
  farMonth: boolean;
  yearRange: { from: number; to: number };
  valid: boolean;
}

export function validateForm(f: ReceiptFormState, now = new Date()): Validation {
  const errors: Validation["errors"] = {};
  const from = now.getFullYear() - 5;
  const to = now.getFullYear() + 1;

  if (!f.accountId) errors.accountId = "required";
  if (f.accountId === NEW_ACCOUNT && !f.newAccountName.trim()) errors.newAccountName = "required";
  if (f.month === "" || f.month < 1 || f.month > 12) errors.month = "required";
  if (f.year === "") errors.year = "required";
  else if (f.year < from || f.year > to) errors.year = "yearRange";
  const amount = parseThousands(f.amount);
  if (!f.amount) errors.amount = "required";
  else if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) errors.amount = "invalid";
  if (f.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(f.dueDate)) errors.dueDate = "invalid";

  let farMonth = false;
  if (f.year !== "" && f.month !== "" && !errors.year && !errors.month) {
    const diff = (f.year - now.getFullYear()) * 12 + (f.month - (now.getMonth() + 1));
    farMonth = Math.abs(diff) > 12;
  }

  return { errors, farMonth, yearRange: { from, to }, valid: Object.keys(errors).length === 0 };
}

export function toConfirmInput(uploadId: string, f: ReceiptFormState, replaceAmountId?: string | null) {
  const isNew = f.accountId === NEW_ACCOUNT;
  return {
    uploadId,
    ...(isNew ? { newAccount: { name: f.newAccountName.trim() } } : { bill_account_id: f.accountId }),
    year: Number(f.year),
    month: Number(f.month),
    amount: parseThousands(f.amount),
    status: f.status,
    due_date: f.dueDate || null,
    ...(replaceAmountId ? { replaceAmountId } : {}),
  };
}

/** Total que quedaría en el mes si ya hay arrastre: base nueva + arrastre existente */
export function resultingMonthTotal(f: ReceiptFormState, a: ReceiptAnalysis) {
  const carried = Number(a.duplicate?.existingAmount?.carried_amount ?? 0);
  return parseThousands(f.amount || "0") + carried;
}
