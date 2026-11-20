/*
 * Flujo de boleta de compra: subir → leer (IA u OCR) → confirmar (o alerta de no legible).
 * Reutiliza la subida privada de boletas; cancelar descarta el archivo.
 */
import { useCallback, useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client";
import { precheckFile, UploadError, uploadReceipt } from "../receipts/api";
import { ANALYZE_PURCHASE, CREATE_PURCHASE, DISCARD_UPLOAD, Purchase, PurchaseAnalysis, UPDATE_PURCHASE } from "./queries";
import { formFromPurchase, PurchaseFormState, toInput } from "./purchaseForm";

export type PurchaseFlow =
  | { kind: "idle" }
  | { kind: "busy" }
  | {
      kind: "review";
      analysis: PurchaseAnalysis | null;
      /** Compra guardada que se está corrigiendo */
      editing?: { id: string; form: PurchaseFormState; previewUrl: string | null };
      saving: boolean;
      error: boolean;
    }
  | { kind: "unreadable"; reason: string }
  | { kind: "error"; code: string };

const REFRESH = ["Consumption", "HomeConsumption", "ShoppingSuggestions", "ConsumptionByMonth"];

export function usePurchaseUpload(onSaved: () => void) {
  const client = useApolloClient();
  const [flow, setFlow] = useState<PurchaseFlow>({ kind: "idle" });
  const [createMutation] = useMutation(CREATE_PURCHASE, { refetchQueries: REFRESH, awaitRefetchQueries: true });
  const [updateMutation] = useMutation(UPDATE_PURCHASE, { refetchQueries: REFRESH, awaitRefetchQueries: true });
  const [discardMutation] = useMutation(DISCARD_UPLOAD);

  const start = useCallback(
    async (file: File) => {
      const pre = precheckFile(file);
      if (pre) return setFlow({ kind: "unreadable", reason: pre });
      try {
        setFlow({ kind: "busy" });
        const { uploadId } = await uploadReceipt(file);
        const { data } = await client.query<{ analyzePurchaseReceipt: PurchaseAnalysis }>({
          query: ANALYZE_PURCHASE,
          variables: { uploadId },
          fetchPolicy: "no-cache",
        });
        const analysis = data.analyzePurchaseReceipt;
        if (!analysis.legible) return setFlow({ kind: "unreadable", reason: analysis.unreadableReason ?? "NO_ITEMS" });
        setFlow({ kind: "review", analysis, saving: false, error: false });
      } catch (err: any) {
        if (err instanceof UploadError && (err.code === "UNSUPPORTED_FILE" || err.code === "FILE_TOO_LARGE")) {
          return setFlow({ kind: "unreadable", reason: err.code });
        }
        setFlow({ kind: "error", code: err instanceof UploadError ? err.code : "GENERIC" });
      }
    },
    [client]
  );

  /** Gasto rápido: la misma pantalla, sin boleta */
  const startManual = useCallback(() => setFlow({ kind: "review", analysis: null, saving: false, error: false }), []);

  /** Corregir una compra ya guardada, en la misma pantalla */
  const startEdit = useCallback(
    (p: Purchase) =>
      setFlow({
        kind: "review",
        analysis: null,
        editing: { id: p.id, form: formFromPurchase(p), previewUrl: p.receiptUrl },
        saving: false,
        error: false,
      }),
    []
  );

  const confirm = useCallback(
    async (form: PurchaseFormState) => {
      if (flow.kind !== "review") return;
      const { analysis, editing } = flow;
      setFlow({ ...flow, saving: true, error: false });
      try {
        if (editing) {
          await updateMutation({ variables: { id: editing.id, input: toInput(form) } });
        } else {
          await createMutation({
            variables: { input: toInput(form, analysis ? { uploadId: analysis.uploadId, engine: analysis.engine } : undefined) },
          });
        }
        setFlow({ kind: "idle" });
        onSaved();
      } catch {
        setFlow({ kind: "review", analysis, editing, saving: false, error: true });
      }
    },
    [flow, createMutation, updateMutation, onSaved]
  );

  const cancel = useCallback(() => {
    if (flow.kind === "review" && flow.analysis) {
      discardMutation({ variables: { uploadId: flow.analysis.uploadId } }).catch(() => undefined);
    }
    setFlow({ kind: "idle" });
  }, [flow, discardMutation]);

  return { flow, start, startManual, startEdit, confirm, cancel, reset: () => setFlow({ kind: "idle" }) };
}
