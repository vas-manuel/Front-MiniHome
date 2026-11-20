import { gql, useMutation, useQuery } from "@apollo/client";
import { useMemo } from "react";
import { buildMonthBills, FixedAccount } from "./monthBills";

export const MONTH_BILLS_QUERY = gql`
  query MonthBills {
    fixedAccountsWithAmounts {
      id
      name
      due_day
      group {
        id
        name
      }
      amounts {
        id
        year
        month
        amount
        base_amount
        carried_amount
        status
        isDeferred
        due_date
      }
    }
  }
`;

const UPDATE_STATUS = gql`
  mutation UpdateBillStatus($id: ID!, $status: BillAccountAmountStatus!) {
    updateBillAccountAmountStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export function useMonthBills(year: number, month: number, options: { skip?: boolean } = {}) {
  const { data, loading, error, refetch } = useQuery<{ fixedAccountsWithAmounts: FixedAccount[] }>(
    MONTH_BILLS_QUERY,
    { skip: options.skip, fetchPolicy: "cache-and-network" }
  );

  const bills = useMemo(
    () => buildMonthBills(data?.fixedAccountsWithAmounts ?? [], year, month),
    [data, year, month]
  );

  const [updateStatus, { loading: saving }] = useMutation(UPDATE_STATUS);

  /* Cambia el estado de todos los registros visibles del mes de una cuenta */
  const setStatus = async (recordIds: string[], status: string) => {
    await Promise.all(recordIds.map((id) => updateStatus({ variables: { id, status } })));
    await refetch();
  };

  return {
    bills,
    hasAccounts: (data?.fixedAccountsWithAmounts?.length ?? 0) > 0,
    loading: loading && !data,
    error,
    saving,
    setStatus,
  };
}
