/*
 * Hogares: todos los hogares registrados con su estado comercial. Al abrir uno se ve su historial de
 * planes y pagos, y un SYSTEM_ADMIN puede darle o quitarle una cortesía, o desactivarlo.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { useSearchParams } from "react-router-dom";
import { Alert, Box, Chip, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { PageHeader } from "../../components/common";
import { amountSx } from "../../brand/theme";
import { useLanguage } from "../../i18n";
import { usePlanLabel } from "../plans/planLimit";
import { ADMIN_HOUSEHOLDS } from "./queries";
import { ADMIN_STATES, AdminState, clp, formatDate, STATE_CHIP } from "./adminFormat";
import { HouseholdDetailDialog, type AdminHouseholdRow } from "./HouseholdDetailDialog";

export default function AdminHouseholdsPage() {
  const { t, locale, language } = useLanguage();
  const planLabel = usePlanLabel();
  const [params, setParams] = useSearchParams();
  const stateFilter = (params.get("estado") as AdminState | null) ?? null;
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, loading, error } = useQuery(ADMIN_HOUSEHOLDS, { fetchPolicy: "cache-and-network" });
  const rows: AdminHouseholdRow[] = data?.adminHouseholds ?? [];

  const counts = useMemo(() => {
    const c = Object.fromEntries(ADMIN_STATES.map((s) => [s, 0])) as Record<AdminState, number>;
    for (const r of rows) c[r.state]++;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!stateFilter || r.state === stateFilter) &&
        (!q || [r.name, r.ownerName, r.ownerEmail, r.rut].some((v) => v?.toLowerCase().includes(q)))
    );
  }, [rows, stateFilter, search]);

  const setFilter = (s: AdminState | null) => {
    const next = new URLSearchParams(params);
    if (s) next.set("estado", s);
    else next.delete("estado");
    setParams(next, { replace: true });
  };

  const columns: GridColDef<AdminHouseholdRow>[] = [
    {
      field: "name",
      headerName: t("adminHousehold"),
      flex: 1.6,
      minWidth: 200,
      renderCell: ({ row }) => (
        <Box sx={{ lineHeight: 1.25, overflow: "hidden", py: 0.5 }}>
          <Typography fontWeight={600} fontSize={14} noWrap>
            {row.name}
          </Typography>
          <Typography fontSize={12} color="text.secondary" noWrap>
            {row.ownerEmail ?? "—"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "state",
      headerName: t("status"),
      width: 150,
      renderCell: ({ row }) => (
        <Chip size="small" label={t(`adminState_${row.state}`)} color={STATE_CHIP[row.state].color} variant={STATE_CHIP[row.state].variant} />
      ),
    },
    {
      field: "planName",
      headerName: t("plan"),
      width: 140,
      valueGetter: (_v, row) => planLabel(row.planName),
      renderCell: ({ row }) => (
        <span>
          {planLabel(row.planName)}
          {row.billingPeriod ? ` · ${t(row.billingPeriod === "YEARLY" ? "plansYearly" : "plansMonthly")}` : ""}
        </span>
      ),
    },
    {
      field: "endsAt",
      headerName: t("adminEnds"),
      width: 130,
      valueGetter: (_v, row) => (row.endsAt ? new Date(row.endsAt).getTime() : null),
      renderCell: ({ row }) => (row.state === "FREE" ? "—" : row.endsAt ? formatDate(row.endsAt, locale) : t("adminNoExpiry")),
    },
    { field: "users", headerName: t("adminMembers"), width: 100, type: "number" },
    { field: "accounts", headerName: t("navAccountsShort"), width: 100, type: "number" },
    { field: "aiReadsThisMonth", headerName: t("adminAiReads"), width: 110, type: "number" },
    {
      field: "totalPaid",
      headerName: t("adminTotalPaid"),
      width: 130,
      type: "number",
      renderCell: ({ row }) => <span style={amountSx as any}>{clp(row.totalPaid, locale)}</span>,
    },
    {
      field: "createdAt",
      headerName: t("adminCreated"),
      width: 130,
      valueGetter: (_v, row) => (row.createdAt ? new Date(row.createdAt).getTime() : null),
      renderCell: ({ row }) => formatDate(row.createdAt, locale),
    },
  ];

  return (
    <Box>
      <PageHeader title={t("adminHouseholdsTitle")} subtitle={t("adminHouseholdsSubtitle", { n: rows.length })} />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{t("genericError")}</Alert>}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder={t("adminSearch")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={t("adminAllN", { n: rows.length })} onClick={() => setFilter(null)} color={!stateFilter ? "primary" : "default"} variant={!stateFilter ? "filled" : "outlined"} />
          {ADMIN_STATES.filter((s) => counts[s] > 0 || s === stateFilter).map((s) => (
            <Chip
              key={s}
              label={`${t(`adminState_${s}`)} · ${counts[s]}`}
              onClick={() => setFilter(s === stateFilter ? null : s)}
              color={s === stateFilter ? "primary" : "default"}
              variant={s === stateFilter ? "filled" : "outlined"}
            />
          ))}
        </Stack>
      </Stack>

      <Paper sx={{ height: 640 }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          loading={loading && !data}
          onRowClick={({ row }) => setOpenId(row.id)}
          getRowHeight={() => 56}
          disableRowSelectionOnClick
          initialState={{ sorting: { sortModel: [{ field: "createdAt", sort: "desc" }] }, pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[25, 50, 100]}
          localeText={language === "es" ? esES.components.MuiDataGrid.defaultProps.localeText : undefined}
          sx={{ border: 0, "& .MuiDataGrid-row": { cursor: "pointer" } }}
        />
      </Paper>

      <HouseholdDetailDialog
        row={rows.find((r) => r.id === openId) ?? null}
        plans={data?.plans ?? []}
        onClose={() => setOpenId(null)}
      />
    </Box>
  );
}
