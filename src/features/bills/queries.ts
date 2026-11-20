import { gql } from "@apollo/client";

export const GET_ACCOUNTS = gql`
  query GetAccounts($type: BillAccountType!) {
    billAccounts(type: $type) {
      id
      name
      due_day
      group {
        id
        name
      }
    }
  }
`;

export const GET_AMOUNTS = gql`
  query GetAmounts($bill_account_id: ID!, $year: Int!) {
    billAccountAmounts(bill_account_id: $bill_account_id, year: $year) {
      id
      year
      month
      amount
      base_amount
      carried_amount
      status
      isDeferred
      product_name
      quantity
      unit_price
      purchase_date
      due_date
      receipt {
        id
        url
        mimeType
      }
    }
  }
`;

export const GET_AMOUNTS_ALL = gql`
  query GetAmountsAll($bill_account_id: ID!) {
    billAccountAmounts(bill_account_id: $bill_account_id) {
      id
      year
      month
      amount
      base_amount
      carried_amount
      status
      isDeferred
    }
  }
`;

export const CREATE_AMOUNT = gql`
  mutation CreateAmount(
    $bill_account_id: ID!
    $year: Int!
    $month: Int!
    $amount: Float
    $installments: Int!
    $status: BillAccountAmountStatus!
    $product_name: String
    $quantity: Int
    $unit_price: Float
    $purchase_date: String
  ) {
    createBillAccountAmount(
      bill_account_id: $bill_account_id
      year: $year
      month: $month
      amount: $amount
      installments: $installments
      status: $status
      product_name: $product_name
      quantity: $quantity
      unit_price: $unit_price
      purchase_date: $purchase_date
    )
  }
`;

export const UPDATE_STATUS = gql`
  mutation UpdateStatus($id: ID!, $status: BillAccountAmountStatus!) {
    updateBillAccountAmountStatus(id: $id, status: $status) {
      id
      status
      isDeferred
      amount
      month
      year
    }
  }
`;

export const UPDATE_AMOUNT = gql`
  mutation UpdateAmount(
    $id: ID!
    $year: Int
    $month: Int
    $amount: Float
    $status: BillAccountAmountStatus
    $quantity: Int
    $unit_price: Float
    $purchase_date: String
  ) {
    updateBillAccountAmount(
      id: $id
      year: $year
      month: $month
      amount: $amount
      status: $status
      quantity: $quantity
      unit_price: $unit_price
      purchase_date: $purchase_date
    ) {
      id
      amount
      base_amount
      carried_amount
      status
      month
      year
    }
  }
`;

export const DEFER_AMOUNT = gql`
  mutation DeferAmount($id: ID!, $targetYear: Int!, $targetMonth: Int!) {
    deferBillAccountAmount(id: $id, targetYear: $targetYear, targetMonth: $targetMonth) {
      id
      year
      month
      amount
      status
      isDeferred
    }
  }
`;

export const DELETE_FROM_PERIOD = gql`
  mutation DeleteFromPeriod($bill_account_id: ID!, $year: Int!, $month: Int!) {
    deleteBillAccountAmountsFromPeriod(bill_account_id: $bill_account_id, year: $year, month: $month)
  }
`;

export const DELETE_SINGLE = gql`
  mutation DeleteSingle($id: ID!) {
    deleteBillAccountAmount(id: $id)
  }
`;
