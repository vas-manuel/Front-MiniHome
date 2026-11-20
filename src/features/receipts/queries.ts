import { gql } from "@apollo/client";

/* Operaciones de specs/001-carga-boletas-autocompletado/contracts/graphql.md */

export const ANALYZE_RECEIPT = gql`
  query AnalyzeReceipt($uploadId: ID!) {
    analyzeReceipt(uploadId: $uploadId) {
      uploadId
      legible
      unreadableReason
      previewUrl
      total
      totalConfidence
      totalCandidates {
        value
        label
      }
      previousBalance
      totalWithoutPreviousBalance
      periodFrom
      periodTo
      dueDate
      proposedYear
      proposedMonth
      monthConfidence
      providerName
      issuerRut
      customerNumber
      accountSuggestions {
        confidence
        reason
        account {
          id
          name
          due_day
          group {
            id
            name
          }
        }
      }
      duplicate {
        sameFile
        existingAmount {
          id
          year
          month
          amount
          base_amount
          carried_amount
          status
        }
      }
    }
  }
`;

export const CONFIRM_RECEIPT = gql`
  mutation ConfirmReceiptAmount($input: ConfirmReceiptInput!) {
    confirmReceiptAmount(input: $input) {
      replaced
      account {
        id
        name
      }
      amount {
        id
        year
        month
        amount
        status
        due_date
      }
    }
  }
`;

export const DISCARD_RECEIPT = gql`
  mutation DiscardReceiptUpload($uploadId: ID!) {
    discardReceiptUpload(uploadId: $uploadId)
  }
`;

export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type UnreadableReason = "NO_TOTAL" | "LOW_QUALITY" | "NO_TEXT" | "UNSUPPORTED_FILE" | "PROTECTED_PDF";

export interface AccountSuggestion {
  confidence: Confidence;
  reason: "LEARNED_CUSTOMER_NUMBER" | "LEARNED_ISSUER" | "MERCHANT" | "NAME_SIMILARITY";
  account: { id: string; name: string; due_day?: number | null; group?: { id: string; name: string } | null };
}

export interface ReceiptAnalysis {
  uploadId: string;
  legible: boolean;
  unreadableReason?: UnreadableReason | null;
  previewUrl?: string | null;
  total?: number | null;
  totalConfidence?: Confidence | null;
  totalCandidates: { value: number; label: string }[];
  previousBalance?: number | null;
  totalWithoutPreviousBalance?: number | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  dueDate?: string | null;
  proposedYear?: number | null;
  proposedMonth?: number | null;
  monthConfidence?: Confidence | null;
  providerName?: string | null;
  issuerRut?: string | null;
  customerNumber?: string | null;
  accountSuggestions: AccountSuggestion[];
  duplicate?: {
    sameFile: boolean;
    existingAmount?: { id: string; year: number; month: number; amount: number; base_amount: number; carried_amount: number; status: string } | null;
  } | null;
}
