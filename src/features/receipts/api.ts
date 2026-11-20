/* Transporte del archivo (contracts/rest-receipts.md); los datos van por GraphQL */

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
export const ACCEPT_ATTR = "image/*,.heic,.heif,application/pdf";

export type UploadErrorCode = "UNSUPPORTED_FILE" | "FILE_TOO_LARGE" | "UNAUTHENTICATED" | "FORBIDDEN" | "NETWORK" | "INTERNAL";

export class UploadError extends Error {
  constructor(public code: UploadErrorCode, message = code) {
    super(message);
  }
}

/** Base del Backend a partir de VITE_API_URL (que termina en /graphql) */
export function apiBase() {
  const url = import.meta.env.VITE_API_URL?.trim() || "http://localhost:3030/graphql";
  return url.replace(/\/graphql\/?$/, "").replace(/\/+$/, "");
}

/** Convierte rutas relativas del Backend (/api/...) en absolutas */
export function backendUrl(pathOrUrl: string) {
  return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${apiBase()}${pathOrUrl}`;
}

/** Validación previa en el navegador (FR-002); el servidor vuelve a validar por contenido */
export function precheckFile(file: File): UploadErrorCode | null {
  if (file.size > MAX_RECEIPT_BYTES) return "FILE_TOO_LARGE";
  const name = file.name.toLowerCase();
  const typeOk = ACCEPTED_TYPES.includes(file.type) || /\.(heic|heif)$/.test(name);
  return typeOk ? null : "UNSUPPORTED_FILE";
}

export async function uploadReceipt(file: File, signal?: AbortSignal): Promise<{ uploadId: string; mimeType: string }> {
  const body = new FormData();
  body.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/receipts/uploads`, { method: "POST", body, credentials: "include", signal });
  } catch {
    throw new UploadError("NETWORK");
  }
  if (!res.ok) {
    const code = (await res.json().catch(() => null))?.error?.code as UploadErrorCode | undefined;
    throw new UploadError(code ?? (res.status === 413 ? "FILE_TOO_LARGE" : "INTERNAL"));
  }
  return res.json();
}

/** Descarga un archivo privado con la sesión y devuelve una URL local para mostrarlo */
export async function fetchPrivateFile(pathOrUrl: string): Promise<{ url: string; type: string }> {
  const res = await fetch(backendUrl(pathOrUrl), { credentials: "include" });
  if (!res.ok) throw new UploadError(res.status === 401 ? "UNAUTHENTICATED" : "INTERNAL");
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), type: blob.type };
}
