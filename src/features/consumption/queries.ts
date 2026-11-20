import { gql } from "@apollo/client";

/* Consumo (rama 002-consumo-boletas-productos): Backend src/graphql/typeDefs/purchases.ts */

export interface ExpenseCategory {
  id: string;
  code: string | null;
  name: string;
  monthlyBudget: number | null;
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
    unit_price: number | null;
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

const CATEGORY = `id code name monthlyBudget`;

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
      items { id description product_name quantity unit unit_price line_total discount category { ${CATEGORY} } }
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

export const UPDATE_PURCHASE = gql`
  mutation UpdatePurchase($id: ID!, $input: PurchaseInput!) {
    updatePurchase(id: $id, input: $input) { id total purchase_date }
  }
`;

export const UPDATE_CATEGORY = gql`
  mutation UpdateExpenseCategory($id: ID!, $name: String, $monthlyBudget: Float) {
    updateExpenseCategory(id: $id, name: $name, monthlyBudget: $monthlyBudget) { ${CATEGORY} }
  }
`;

export const REORDER_CATEGORIES = gql`
  mutation ReorderExpenseCategories($ids: [ID!]!) {
    reorderExpenseCategories(ids: $ids) { ${CATEGORY} }
  }
`;

export const DELETE_CATEGORY = gql`
  mutation DeleteExpenseCategory($id: ID!, $moveToId: ID!) {
    deleteExpenseCategory(id: $id, moveToId: $moveToId)
  }
`;

export interface MonthlyConsumption {
  year: number;
  month: number;
  total: number;
}

export const CONSUMPTION_BY_MONTH = gql`
  query ConsumptionByMonth($year: Int!, $month: Int!, $months: Int) {
    consumptionByMonth(year: $year, month: $month, months: $months) { year month total }
  }
`;

/* Inicio: consumo del mes, categorías con presupuesto y presupuesto del hogar */
export const HOME_CONSUMPTION = gql`
  query HomeConsumption($year: Int!, $month: Int!) {
    me { household { monthlyBudget } }
    consumptionSummary(year: $year, month: $month) {
      total
      categories { total items category { ${CATEGORY} } }
    }
    expenseCategories { ${CATEGORY} }
  }
`;

export interface ProductHistory {
  productName: string;
  unit: string;
  totalQuantity: number;
  totalSpent: number;
  averageUnitPrice: number | null;
  monthly: { year: number; month: number; quantity: number; spent: number; averageUnitPrice: number | null }[];
  byMerchant: { merchant: string | null; purchases: number; averageUnitPrice: number | null; lastDate: string }[];
  frequency: { averageDaysBetween: number | null; daysSinceLast: number | null; lastDate: string | null; nextExpected: string | null; timesBought: number };
  purchases: { date: string; merchant: string | null; quantity: number; lineTotal: number }[];
}

export const PRODUCT_HISTORY = gql`
  query ProductHistory($productName: String!, $unit: String!, $year: Int!, $month: Int!, $months: Int) {
    productHistory(productName: $productName, unit: $unit, year: $year, month: $month, months: $months) {
      productName
      unit
      totalQuantity
      totalSpent
      averageUnitPrice
      monthly { year month quantity spent averageUnitPrice }
      byMerchant { merchant purchases averageUnitPrice lastDate }
      frequency { averageDaysBetween daysSinceLast lastDate nextExpected timesBought }
      purchases { date merchant quantity lineTotal }
    }
  }
`;

export interface ShoppingSuggestion {
  key: string;
  productName: string;
  unit: string;
  category: ExpenseCategory;
  usualQuantity: number;
  averageDaysBetween: number;
  daysSinceLast: number;
  lastDate: string;
  nextExpected: string;
  urgency: number;
  averageUnitPrice: number | null;
  bestMerchant: string | null;
  bestUnitPrice: number | null;
}

export const SHOPPING_SUGGESTIONS = gql`
  query ShoppingSuggestions {
    shoppingSuggestions {
      key
      productName
      unit
      usualQuantity
      averageDaysBetween
      daysSinceLast
      lastDate
      nextExpected
      urgency
      averageUnitPrice
      bestMerchant
      bestUnitPrice
      category { ${CATEGORY} }
    }
  }
`;
