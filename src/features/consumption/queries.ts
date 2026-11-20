import { gql } from "@apollo/client";

/* Consumo (rama 002-consumo-boletas-productos): Backend src/graphql/typeDefs/purchases.ts */

export interface ExpenseCategory {
  id: string;
  code: string | null;
  name: string;
}

export interface PurchaseAnalysis {
  uploadId: string;
  engine: "AI" | "OCR";
  legible: boolean;
  unreadableReason: string | null;
  previewUrl: string | null;
  merchantName: string | null;
  purchaseDate: string | null;
  paymentMethod: string | null;
  total: number | null;
  itemsTotal: number;
  difference: number;
  warnings: string[];
  sameFile: boolean;
  items: {
    description: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number | null;
    discount: number;
    lineTotal: number;
    categoryId: string;
    learned: boolean;
  }[];
}

export interface Purchase {
  id: string;
  merchant_name: string | null;
  purchase_date: string;
  total: number;
  payment_method: string | null;
  source: "MANUAL" | "RECEIPT_AI" | "RECEIPT_OCR";
  receiptUrl: string | null;
  items: {
    id: string;
    description: string | null;
    product_name: string;
    quantity: number;
    unit: string;
    line_total: number;
    discount: number;
    category: ExpenseCategory;
  }[];
}

export interface ConsumptionSummary {
  total: number;
  categories: { category: ExpenseCategory; total: number; items: number }[];
  products: {
    productName: string;
    unit: string;
    category: ExpenseCategory;
    quantity: number;
    spent: number;
    purchases: number;
    averageUnitPrice: number | null;
    lastDate: string;
  }[];
}

const CATEGORY = `id code name`;

export const GET_CATEGORIES = gql`
  query ExpenseCategories {
    expenseCategories { ${CATEGORY} }
    purchaseReaderInfo { engine model }
  }
`;

export const GET_CONSUMPTION = gql`
  query Consumption($year: Int!, $month: Int!) {
    consumptionSummary(year: $year, month: $month) {
      total
      categories { total items category { ${CATEGORY} } }
      products { productName unit quantity spent purchases averageUnitPrice lastDate category { ${CATEGORY} } }
    }
    purchases(year: $year, month: $month) {
      id
      merchant_name
      purchase_date
      total
      payment_method
      source
      receiptUrl
      items { id description product_name quantity unit line_total discount category { ${CATEGORY} } }
    }
  }
`;

export const ANALYZE_PURCHASE = gql`
  query AnalyzePurchaseReceipt($uploadId: ID!) {
    analyzePurchaseReceipt(uploadId: $uploadId) {
      uploadId
      engine
      legible
      unreadableReason
      previewUrl
      merchantName
      purchaseDate
      paymentMethod
      total
      itemsTotal
      difference
      warnings
      sameFile
      items { description productName quantity unit unitPrice discount lineTotal categoryId learned }
    }
  }
`;

export const CREATE_PURCHASE = gql`
  mutation CreatePurchase($input: PurchaseInput!) {
    createPurchase(input: $input) { id total purchase_date }
  }
`;

export const DELETE_PURCHASE = gql`
  mutation DeletePurchase($id: ID!) {
    deletePurchase(id: $id)
  }
`;

export const CREATE_CATEGORY = gql`
  mutation CreateExpenseCategory($name: String!) {
    createExpenseCategory(name: $name) { ${CATEGORY} }
  }
`;

export const DISCARD_UPLOAD = gql`
  mutation DiscardReceiptUpload($uploadId: ID!) {
    discardReceiptUpload(uploadId: $uploadId)
  }
`;
