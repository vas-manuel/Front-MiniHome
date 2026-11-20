/*
 * Flujo de carga de boletas: subir → analizar → modal (o alerta de no legible) → confirmar.
 * Cancelar descarta la subida; ante AMOUNT_EXISTS se pregunta si reemplazar (FR-013).
 */
import { useCallback, useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client";
import { ANALYZE_RECEIPT, CONFIRM_RECEIPT, DISCARD_RECEIPT, ReceiptAnalysis, UnreadableReason } from "./queries";
import { precheckFile, UploadError, uploadReceipt, UploadErrorCode } from "./api";
import { ReceiptFormState, toConfirmInput } from "./receiptForm";

export type UnreadableKind = UnreadableReason | "FILE_TOO_LARGE";

export type ReceiptFlow =
  | { kind: "idle" }
  | { kind: "busy"; step: "uploading" | "analyzing" }
  | { kind: "review"; analysis: ReceiptAnalysis; saving: boolean; conflict: Conflict | null; error: string | null }
  | { kind: "unreadable"; reason: UnreadableKind }
  | { kind: "error"; code: UploadErrorCode | "UPLOAD_NOT_FOUND" | "FORBIDDEN" | "GENERIC" };

export interface Conflict {
  existingAmountId: string;
  existingAmount: number | null;
  form: ReceiptFormState;
}

export interface SavedResult {
  accountName: string;
  year: number;
  month: number;
  replaced: boolean;
}

const REFRESH = ["MonthBills", "GetAmounts", "GetAmountsAll", "GetAccounts", "AnalysisDashboard"];

const gqlCode = (err: any): string | undefined => err?.graphQLErrors?.[0]?.extensions?.code;

export function useReceiptUpload(onSaved?: (r: SavedResult) => void) {
  const client = useApolloClient();
  const [flow, setFlow] = useState<ReceiptFlow>({ kind: "idle" });
  const [confirmMutation] = useMutation(CONFIRM_RECEIPT, { refetchQueries: REFRESH, awaitRefetchQueries: true });
  const [discardMutation] = useMutation(DISCARD_RECEIPT);

  const start = useCallback(
    async (file: File) => {
      const pre = precheckFile(file);
      if (pre) {
        setFlow({ kind: "unreadable", reason: pre === "FILE_TOO_LARGE" ? "FILE_TOO_LARGE" : "UNSUPPORTED_FILE" });
        return;
      }
      try {
        setFlow({ kind: "busy", step: "uploading" });
        const { uploadId } = await uploadReceipt(file);
        setFlow({ kind: "busy", step: "analyzing" });
        const { data } = await client.query<{ analyzeReceipt: ReceiptAnalysis }>({
          query: ANALYZE_RECEIPT,
          variables: { uploadId },
          fetchPolicy: "no-cache",
        });
        const analysis = data.analyzeReceipt;
        if (!analysis.legible) {
          setFlow({ kind: "unreadable", reason: analysis.unreadableReason ?? "NO_TOTAL" });
          return;
        }
        setFlow({ kind: "review", analysis, saving: false, conflict: null, error: null });
      } catch (err: any) {
        if (err instanceof UploadError) {
          if (err.code === "UNSUPPORTED_FILE" || err.code === "FILE_TOO_LARGE") {
            setFlow({ kind: "unreadable", reason: err.code });
          } else {
            setFlow({ kind: "error", code: err.code });
          }
          return;
        }
        const code = gqlCode(err);
        setFlow({ kind: "error", code: code === "FORBIDDEN" || code === "UPLOAD_NOT_FOUND" ? code : err?.networkError ? "NETWORK" : "GENERIC" });
      }
    },
    [client]
  );

  const confirm = useCallback(
    async (form: ReceiptFormState, replaceAmountId?: string) => {
      if (flow.kind !== "review") return;
      const { analysis } = flow;
      setFlow({ ...flow, saving: true, error: null, conflict: null });
      try {
        const { data } = await confirmMutation({ variables: { input: toConfirmInput(analysis.uploadId, form, replaceAmountId) } });
        const r = data.confirmReceiptAmount;
        setFlow({ kind: "idle" });
        onSaved?.({ accountName: r.account.name, year: r.amount.year, month: r.amount.month, replaced: r.replaced });
      } catch (err: any) {
        const code = gqlCode(err);
        const ext = err?.graphQLErrors?.[0]?.extensions ?? {};
        if (code === "AMOUNT_EXISTS") {
          setFlow({
            kind: "review",
            analysis,
            saving: false,
            error: null,
            conflict: { existingAmountId: ext.existingAmountId, existingAmount: ext.existingAmount ?? null, form },
          });
          return;
        }
        if (code === "UPLOAD_NOT_FOUND") {
          setFlow({ kind: "error", code: "UPLOAD_NOT_FOUND" });
          return;
        }
        setFlow({ kind: "review", analysis, saving: false, conflict: null, error: code === "VALIDATION" ? "validation" : "generic" });
      }
    },
    [flow, confirmMutation, onSaved]
  );

  const replace = useCallback(() => {
    if (flow.kind === "review" && flow.conflict) confirm(flow.conflict.form, flow.conflict.existingAmountId);
  }, [flow, confirm]);

  const dismissConflict = useCallback(() => {
    if (flow.kind === "review") setFlow({ ...flow, conflict: null });
  }, [flow]);

  /** Cerrar el modal: descarta la subida pendiente para no dejar nada guardado (FR-011) */
  const cancel = useCallback(async () => {
    if (flow.kind === "review") {
      discardMutation({ variables: { uploadId: flow.analysis.uploadId } }).catch(() => undefined);
    }
    setFlow({ kind: "idle" });
  }, [flow, discardMutation]);

  return { flow, start, confirm, replace, dismissConflict, cancel, reset: () => setFlow({ kind: "idle" }) };
}
