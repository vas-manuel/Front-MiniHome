import { gql } from "@apollo/client";

export const ADMIN_HOUSEHOLD_FIELDS = gql`
  fragment AdminHouseholdFields on AdminHousehold {
    id
    name
    rut
    createdAt
    active
    ownerName
    ownerEmail
    planId
    planName
    state
    billingPeriod
    endsAt
    users
    accounts
    aiReadsThisMonth
    aiCostThisMonthUsd
    totalPaid
    lastPaymentAt
    grantReason
    grantNote
  }
`;

export const ADMIN_HOUSEHOLDS = gql`
  ${ADMIN_HOUSEHOLD_FIELDS}
  query AdminHouseholds {
    adminHouseholds {
      ...AdminHouseholdFields
    }
    plans {
      id
      name
      priceMonthly
    }
  }
`;

export const ADMIN_HOUSEHOLD_DETAIL = gql`
  query AdminHouseholdDetail($householdId: ID!) {
    adminHouseholdDetail(householdId: $householdId) {
      changes {
        id
        oldPlanName
        newPlanName
        reason
        note
        changedAt
        changedByName
      }
      payments {
        id
        amount
        status
        paidAt
        periodEnd
      }
    }
  }
`;

export const GRANT_PLAN = gql`
  ${ADMIN_HOUSEHOLD_FIELDS}
  mutation GrantHouseholdPlan($householdId: ID!, $planId: ID!, $months: Int, $reason: GrantReason!, $note: String) {
    grantHouseholdPlan(householdId: $householdId, planId: $planId, months: $months, reason: $reason, note: $note) {
      ...AdminHouseholdFields
    }
  }
`;

export const REVOKE_GRANT = gql`
  ${ADMIN_HOUSEHOLD_FIELDS}
  mutation RevokeHouseholdGrant($householdId: ID!, $note: String) {
    revokeHouseholdGrant(householdId: $householdId, note: $note) {
      ...AdminHouseholdFields
    }
  }
`;

export const SET_HOUSEHOLD_ACTIVE = gql`
  mutation SetHouseholdActive($id: ID!, $active: Boolean!) {
    activate: activateHousehold(id: $id) @include(if: $active) {
      id
      status
    }
    deactivate: deactivateHousehold(id: $id) @skip(if: $active) {
      id
      status
    }
  }
`;

export const ADMIN_OVERVIEW = gql`
  query AdminOverview {
    adminBusinessMetrics {
      totalHouseholds
      newHouseholdsThisMonth
      paying
      pastDue
      canceling
      trial
      complimentary
      free
      inactive
      activeSubscriptions
      monthlySubscriptions
      yearlySubscriptions
      mrr
      netMrr
      arr
      arpu
      canceledLast30Days
      churnRate
      everPaid
      conversionRate
      trialsEndingSoon
      planChanges {
        total
        upgrades
        downgrades
        periodChanges
        households
        last30Days
      }
      aiReadsThisMonth
      aiCostThisMonthUsd
      byPlan {
        planId
        planName
        households
        paying
        monthly
        yearly
        trial
        complimentary
        mrr
        aiReadsThisMonth
        aiCostThisMonthUsd
      }
    }
    adminGrowth(months: 12) {
      month
      newHouseholds
      newSubscriptions
      cancellations
    }
    adminFinanceReport(months: 2) {
      month
      gross
      profit
    }
    adminFinanceSettings {
      usdToClp
    }
  }
`;

export const FINANCE_SETTINGS_FIELDS = gql`
  fragment FinanceSettingsFields on FinanceSettings {
    providerFeePercent
    providerFeeFixed
    vatRate
    chargesVat
    usdToClp
    fixedCosts {
      name
      amount
      currency
      since
    }
  }
`;

export const ADMIN_FINANCE = gql`
  ${FINANCE_SETTINGS_FIELDS}
  query AdminFinance($months: Int!) {
    adminFinanceReport(months: $months) {
      month
      payments
      gross
      vat
      providerFees
      aiCost
      fixedCosts
      profit
    }
    adminFinanceSettings {
      ...FinanceSettingsFields
    }
  }
`;

export const UPDATE_FINANCE_SETTINGS = gql`
  ${FINANCE_SETTINGS_FIELDS}
  mutation UpdateFinanceSettings($input: FinanceSettingsInput!) {
    updateFinanceSettings(input: $input) {
      ...FinanceSettingsFields
    }
  }
`;
