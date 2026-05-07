import { gql, useMutation, useQuery } from "@apollo/client";
import { useState } from "react";
import { useTranslate } from "./i18n";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  MenuItem,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import EditIcon from "@mui/icons-material/Edit";
import ScheduleIcon from "@mui/icons-material/Schedule";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";

/* =======================
   GRAPHQL
======================= */

const GET_ACCOUNTS = gql`
  query GetAccounts($type: BillAccountType!) {
    billAccounts(type: $type) {
      id
      name
      group {
        id
        name
      }
    }
  }
`;

const GET_AMOUNTS = gql`
  query GetAmounts($bill_account_id: ID!, $year: Int!) {
    billAccountAmounts(bill_account_id: $bill_account_id, year: $year) {
      id
      year
      month
      amount
      status
      isDeferred
      product_name
      quantity
      unit_price
      purchase_date
    }
  }
`;

const GET_AMOUNTS_ALL = gql`
  query GetAmountsAll($bill_account_id: ID!) {
    billAccountAmounts(bill_account_id: $bill_account_id) {
      id
      year
      month
      amount
      status
      isDeferred
    }
  }
`;

const CREATE_AMOUNT = gql`
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

const UPDATE_STATUS = gql`
  mutation UpdateStatus(
    $id: ID!
    $status: BillAccountAmountStatus!
    $amount: Float
    $isDeferred: Boolean
  ) {
    updateBillAccountAmountStatus(
      id: $id
      status: $status
      amount: $amount
      isDeferred: $isDeferred
    ) {
      id
      status
      isDeferred
      amount
      month
      year
    }
  }
`;

const IMPORT_AMOUNTS = gql`
  mutation ImportAmounts($fileBase64: String!) {
    importBillAccountAmounts(fileBase64: $fileBase64) {
      totalRows
      successCount
      errorCount
    }
  }
`;

const DELETE_FROM_PERIOD = gql`
  mutation DeleteFromPeriod(
    $bill_account_id: ID!
    $year: Int!
    $month: Int!
  ) {
    deleteBillAccountAmountsFromPeriod(
      bill_account_id: $bill_account_id
      year: $year
      month: $month
    )
  }
`;

const DELETE_SINGLE = gql`
  mutation DeleteSingle($id: ID!) {
    deleteBillAccountAmount(id: $id)
  }
`;

/* =======================
   HELPERS
======================= */

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
});

const monthFormatter = (
  month: number,
  year: number,
  locale: string
) => {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
};

const statusColor = (status: string, isOverdue: boolean) => {
  if (isOverdue) return "error";

  switch (status) {
    case "PAID":
      return "success";
    case "CONFIRMED":
      return "info";
    case "NOT_CONFIRMED":
      return "warning";
    default:
      return "default";
  }
};

const translateStatus = (status: string, isDeferred?: boolean) => {
  if (isDeferred) return "Postergado";

  switch (status) {
    case "PAID":
      return "Pagado";
    case "CONFIRMED":
      return "Confirmado";
    case "NOT_CONFIRMED":
      return "Pendiente";
    default:
      return status;
  }
};

const isAmountOverdue = (a: any) => {
  if (a.status === "PAID") return false;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // Si es año anterior y no está pagado → atrasado
  if (a.year < currentYear) return true;

  // Si es mismo año pero mes anterior → atrasado
  if (a.year === currentYear && a.month < currentMonth) return true;

  return false;
};

/* =======================
   COMPONENT
======================= */

export default function BillAccountsManager() {
  const currentMonth = new Date().getMonth() + 1;

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentLang = storedUser.language || "es";
  const { t } = useTranslate(currentLang);

  const localeMap: Record<string, string> = {
    es: "es-CL",
    en: "en-US",
    pt: "pt-BR",
  };

  const locale = localeMap[currentLang] || "es-CL";

  const [type, setType] = useState<"FIXED" | "VARIABLE">("FIXED");
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [month, setMonth] = useState(currentMonth);
  // ✅ Monto como string para permitir borrar el 0 libremente
  const [amount, setAmount] = useState<string>("");
  const [installments, setInstallments] = useState(1);

  // ✅ Campos para VARIABLE
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [formStatus, setFormStatus] = useState<"NOT_CONFIRMED" | "CONFIRMED">("NOT_CONFIRMED");

  // ✅ Cálculo dinámico para cuentas de consumo
  const liveTotal =
    type === "VARIABLE"
      ? quantity * (Number(unitPrice) || 0)
      : 0;
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  const { data: accountsData } = useQuery(GET_ACCOUNTS, {
    variables: { type },
  });

  const { data: amountsData, refetch } = useQuery(GET_AMOUNTS, {
    variables: { bill_account_id: selectedAccount?.id, year },
    skip: !selectedAccount,
  });

  const { data: amountsAllData } = useQuery(GET_AMOUNTS_ALL, {
    variables: { bill_account_id: selectedAccount?.id },
    skip: !selectedAccount,
  });

  const [createAmount] = useMutation(CREATE_AMOUNT);
  const [updateStatus] = useMutation(UPDATE_STATUS);
  const [importAmounts] = useMutation(IMPORT_AMOUNTS);
  const [deleteFromPeriod] = useMutation(DELETE_FROM_PERIOD);
  const [deleteSingle] = useMutation(DELETE_SINGLE);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteMode, setDeleteMode] = useState<"ONE" | "FORWARD">("ONE");

  const openCreate = () => {
    setEditing(null);
    setMonth(currentMonth);
    setAmount("");
    setInstallments(1);
    setFormStatus("NOT_CONFIRMED");

    // ✅ Para cuentas de consumo la cantidad parte en 1
    if (type === "VARIABLE") {
      setQuantity(1);
      setUnitPrice("");
      setPurchaseDate("");
    }

    setOpen(true);
  };

  const openEdit = (a: any) => {
    setEditing(a);
    setMonth(a.month);
    setAmount(String(a.amount));
    setInstallments(1);
    setFormStatus(a.status);
    setOpen(true);
  };

  const handleSave = async () => {
    const numericAmount = Number(amount);

    // ✅ Validar monto solo para cuentas FIXED
    if (type === "FIXED") {
      if (!amount || isNaN(numericAmount)) {
        alert("Ingrese un monto válido");
        return;
      }
    }

    if (editing) {
      await updateStatus({
        variables: {
          id: editing.id,
          status: formStatus,
          amount: numericAmount,
          isDeferred: editing.isDeferred,
        },
      });
    } else {
      if (type === "VARIABLE") {
        if (!quantity || !unitPrice) {
          alert("Completa cantidad y precio unitario");
          return;
        }

        await createAmount({
          variables: {
            bill_account_id: selectedAccount.id,
            year,
            month,
            amount: null,
            installments: 1,
            status: formStatus,
            product_name: selectedAccount.name,
            quantity: Number(quantity),
            unit_price: Number(unitPrice),
            purchase_date: purchaseDate || null,
          },
        });
      } else {
        await createAmount({
          variables: {
            bill_account_id: selectedAccount.id,
            year,
            month,
            amount: numericAmount,
            installments,
            status: formStatus,
          },
        });
      }
    }

    setOpen(false);
    refetch();
  };

  const handleImport = async (e: any) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      await importAmounts({ variables: { fileBase64: base64 } });
      refetch();
      alert("Importación completada ✅");
    };
    reader.readAsDataURL(file);
  };

  const cycleStatus = (status: string) => {
    if (status === "NOT_CONFIRMED") return "CONFIRMED";
    if (status === "CONFIRMED") return "PAID";
    return "NOT_CONFIRMED";
  };

  const handleDefer = async (a: any) => {
    const nextMonth = a.month === 12 ? 1 : a.month + 1;
    const nextYear = a.month === 12 ? a.year + 1 : a.year;

    // 1️⃣ Marcar actual como diferido
    await updateStatus({
      variables: {
        id: a.id,
        status: a.status,
        isDeferred: true,
      },
    });

    // 2️⃣ Crear nuevo monto en el mes siguiente
    await createAmount({
      variables: {
        bill_account_id: selectedAccount.id,
        year: nextYear,
        month: nextMonth,
        amount: a.amount,
        installments: 1,
        status: "NOT_CONFIRMED",
      },
    });

    refetch();
  };

  return (
    <Box>
      <Typography variant="h5" mb={3}>
        {t("amountManagement") || "Amount Management"}
      </Typography>

      <ToggleButtonGroup
        value={type}
        exclusive
        onChange={(_, v) => v && setType(v)}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="FIXED">
          Cuentas Fijas
        </ToggleButton>
        <ToggleButton value="VARIABLE">
          Cuentas de Consumo
        </ToggleButton>
      </ToggleButtonGroup>

      <Stack direction="row" spacing={2} mb={3}>
          <TextField
            select
            fullWidth
            label={t("selectAccount") || "Select Account"}
          value={selectedAccount?.id || ""}
          onChange={(e) => {
            const acc = accountsData?.billAccounts.find(
              (a: any) => a.id === e.target.value
            );
            setSelectedAccount(acc);
          }}
        >
          {Object.entries(
            (accountsData?.billAccounts || []).reduce(
              (acc: any, item: any) => {
                const groupName = item.group?.name || "Sin Grupo";
                if (!acc[groupName]) acc[groupName] = [];
                acc[groupName].push(item);
                return acc;
              },
              {}
            )
          ).flatMap(([groupName, items]: any, index: number) => [
            <MenuItem key={`group-${index}`} disabled>
              <strong>{groupName}</strong>
            </MenuItem>,
            ...items.map((accItem: any) => (
              <MenuItem key={accItem.id} value={accItem.id}>
                {accItem.name}
              </MenuItem>
            )),
          ])}
        </TextField>

        <TextField
          select
          label={t("year") || "Year"}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          sx={{ width: 120 }}
        >
          {(() => {
            const currentYear = new Date().getFullYear();
            const years: number[] = [];
            for (let y = currentYear - 5; y <= currentYear + 5; y++) {
              years.push(y);
            }
            return years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ));
          })()}
        </TextField>
      </Stack>

      {selectedAccount && (
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} mb={2}>
            <Button
              variant="contained"
              startIcon={<AddCircleIcon />}
              color="primary"
              sx={{
                textTransform: "none",
                fontWeight: "bold",
                borderRadius: 2,
              }}
              onClick={openCreate}
            >
              {t("add") || t("addAmount") || "Add"}
            </Button>

            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              component="label"
            >
              {t("importExcel") || "Import Excel"}
              <input
                hidden
                type="file"
                accept=".xlsx"
                onChange={handleImport}
              />
            </Button>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => {
                const example = [
                  ["bill_account_id", "year", "month", "amount"],
                  ["ID_CUENTA", year, currentMonth, 10000],
                ];

                const worksheet = (window as any).XLSX
                  ? (window as any).XLSX.utils.aoa_to_sheet(example)
                  : null;

                if (!worksheet) {
                  alert("XLSX not available");
                  return;
                }

                const workbook = (window as any).XLSX.utils.book_new();
                (window as any).XLSX.utils.book_append_sheet(
                  workbook,
                  worksheet,
                  "Template"
                );
                (window as any).XLSX.writeFile(
                  workbook,
                  "amount_import_template.xlsx"
                );
              }}
            >
              {t("downloadTemplate") || "Download Template"}
            </Button>
          </Stack>

          {/* ✅ Resumen financiero VARIABLE */}
          {type === "VARIABLE" && amountsData?.billAccountAmounts && (
            <>
              {(() => {
                const monthlyTotal =
                  amountsData.billAccountAmounts.reduce(
                    (sum: number, a: any) =>
                      sum + Number(a.amount),
                    0
                  );

                const prevMonth =
                  month === 1 ? 12 : month - 1;
                const prevYear =
                  month === 1 ? year - 1 : year;

                const prevMonthTotal =
                  amountsAllData?.billAccountAmounts
                    ?.filter(
                      (a: any) =>
                        a.month === prevMonth &&
                        a.year === prevYear
                    )
                    .reduce(
                      (sum: number, a: any) =>
                        sum + Number(a.amount),
                      0
                    ) || 0;

                const variation =
                  prevMonthTotal > 0
                    ? ((monthlyTotal - prevMonthTotal) /
                        prevMonthTotal) *
                      100
                    : 0;

                const annualAmounts =
                  amountsAllData?.billAccountAmounts?.filter(
                    (a: any) => a.year === year
                  ) || [];

                const annualTotal =
                  annualAmounts.reduce(
                    (sum: number, a: any) =>
                      sum + Number(a.amount),
                    0
                  );

                const monthsWithData = new Set(
                  annualAmounts.map(
                    (a: any) => `${a.year}-${a.month}`
                  )
                ).size;

                const monthlyAverage =
                  monthsWithData > 0
                    ? annualTotal / monthsWithData
                    : 0;

                return (
                  <Stack spacing={2} mb={3}>
                    <Box
                      p={2}
                      sx={{
                        backgroundColor: "#f1f5f9",
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="subtitle2">
                        Total mensual
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {currencyFormatter.format(
                          monthlyTotal
                        )}
                      </Typography>

                      {prevMonthTotal > 0 && (
                        <Typography
                          variant="body2"
                          color={
                            variation > 0
                              ? "error"
                              : "success"
                          }
                        >
                          {variation > 0 ? "▲" : "▼"}{" "}
                          {variation.toFixed(1)}% vs mes
                          anterior
                        </Typography>
                      )}
                    </Box>

                    <Box
                      p={2}
                      sx={{
                        backgroundColor: "#eef2ff",
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="subtitle2">
                        Total acumulado año {year}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {currencyFormatter.format(
                          annualTotal
                        )}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Promedio mensual:{" "}
                        {currencyFormatter.format(
                          monthlyAverage
                        )}
                      </Typography>
                    </Box>
                  </Stack>
                );
              })()}
            </>
          )}

          {/* Cabecera */}
          <Box
            display="grid"
            gridTemplateColumns="2fr 1fr 1fr 1fr"
            fontWeight="bold"
            mb={1}
            px={1}
            width="100%"
          >
            <Typography>{t("period") || "Period"}</Typography>
            <Typography>{t("amount") || "Amount"}</Typography>
            <Typography>{t("status") || "Status"}</Typography>
            <Typography align="center">
              {t("actions") || "Actions"}
            </Typography>
          </Box>

          <Stack spacing={1}>
            {amountsData?.billAccountAmounts.map((a: any) => (
              <Box
                key={a.id}
                display="grid"
                gridTemplateColumns="2fr 1fr 1fr 1fr"
                alignItems="center"
                p={1}
                border="1px solid #eee"
                borderRadius={2}
                width="100%"
                sx={{
                  backgroundColor:
                    type === "VARIABLE"
                      ? "#fafafa"
                      : "white",
                }}
              >
                <Box>
                  <Typography sx={{ textTransform: "capitalize" }}>
                    {type === "VARIABLE" && (
                      <ShoppingCartIcon
                        fontSize="small"
                        sx={{ mr: 0.5, verticalAlign: "middle" }}
                      />
                    )}
                    {monthFormatter(a.month, a.year, locale)}
                  </Typography>

                  {type === "VARIABLE" && a.product_name && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {a.product_name} — {a.quantity} x{" "}
                      {currencyFormatter.format(a.unit_price || 0)}
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography fontWeight="bold">
                    {currencyFormatter.format(a.amount)}
                  </Typography>

                  {type === "VARIABLE" && a.purchase_date && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {new Date(a.purchase_date).toLocaleDateString(locale)}
                    </Typography>
                  )}
                </Box>

                <Chip
                  size="small"
                  label={
                    isAmountOverdue(a)
                      ? "Atrasado"
                      : translateStatus(a.status, a.isDeferred)
                  }
                  color={
                    a.isDeferred
                      ? "secondary"
                      : (statusColor(
                          a.status,
                          isAmountOverdue(a)
                        ) as any)
                  }
                />

                <Box display="flex" justifyContent="center" gap={0.5}>
                  <Tooltip title="Cambiar Estado">
                    <IconButton
                      size="small"
                      onClick={() =>
                        updateStatus({
                          variables: {
                            id: a.id,
                            status: cycleStatus(a.status),
                            isDeferred: false, // ✅ Quitar estado postergado al cambiar
                          },
                        }).then(refetch)
                      }
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Postergar">
                    <IconButton
                      size="small"
                      onClick={() => handleDefer(a)}
                    >
                      <AutorenewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      onClick={() => openEdit(a)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Eliminar">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setDeleteTarget(a);
                        setDeleteMode("ONE");
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Stack>

          {/* Gráfico últimos 13 meses */}
          {amountsAllData?.billAccountAmounts && (
            <Box mt={5}>
              <Typography variant="h6" mb={2}>
                Evolución últimos 13 meses
              </Typography>

              {(() => {
                const today = new Date();
                const months: {
                  month: number;
                  year: number;
                  label: string;
                }[] = [];

                // Siempre desde el mes actual hacia atrás 12 meses
                for (let i = 12; i >= 0; i--) {
                  const d = new Date(
                    today.getFullYear(),
                    today.getMonth() - i,
                    1
                  );

                  months.push({
                    month: d.getMonth() + 1,
                    year: d.getFullYear(),
                    label: d.toLocaleDateString("es-CL", {
                      month: "short",
                      year: "2-digit",
                    }),
                  });
                }

                const values = months.map((m) => {
                  const found = amountsAllData.billAccountAmounts.find(
                    (a: any) =>
                      a.month === m.month && a.year === m.year
                  );
                  return found ? found.amount : 0;
                });

                const max = Math.max(...values, 1);
                const svgWidth = 1300;
                const svgHeight = 220;
                const topPadding = 25;
                const bottomPadding = 10;
                const chartHeight = svgHeight - topPadding - bottomPadding;
                const baseY = svgHeight - bottomPadding;

                return (
                  <Box>
                    <svg
                      viewBox={`0 0 1300 400`}
                      preserveAspectRatio="xMinYMin meet"
                      style={{ width: "100%", height: 400 }}
                    >
                      {values.map((v, i) => {
                        const maxWidth = 1000;
                        const barHeight = 22;
                        const gap = 8;

                        const barWidth =
                          max === 0
                            ? 0
                            : (v / max) * maxWidth;

                        const y =
                          i * (barHeight + gap) + 20;

                        const startX = 1150; // punto derecho
                        const x = startX - barWidth;

                        return (
                          <g key={i}>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              fill="#2563eb"
                              rx="6"
                            />
                            {barWidth > 80 && (
                              <text
                                x={x + barWidth / 2}
                                y={y + barHeight / 2}
                                fontSize="14"
                                textAnchor="middle"
                                fill="#ffffff"
                                fontWeight="bold"
                                dominantBaseline="middle"
                              >
                                {currencyFormatter.format(v)}
                              </text>
                            )}
                            <text
                              x={1180}
                              y={y + barHeight / 2}
                              fontSize="14"
                              fill="#333"
                              dominantBaseline="middle"
                            >
                              {months[i].label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    <Box
                      display="flex"
                      justifyContent="space-between"
                      fontSize={12}
                      mt={1}
                    >
                      {months.map((m, i) => (
                        <span key={i}>
                          {m.label}
                        </span>
                      ))}
                    </Box>
                  </Box>
                );
              })()}
            </Box>
          )}
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>
          {editing ? "Editar Monto" : "Nuevo Monto"}
        </DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label={t("month") || "Month"}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            sx={{ mt: 2 }}
          >
            {[...Array(12)].map((_, i) => {
              const m = i + 1;
              const name = new Date(2024, i).toLocaleDateString(locale, {
                month: "long",
              });
              return (
                <MenuItem key={m} value={m}>
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </MenuItem>
              );
            })}
          </TextField>

          {type === "FIXED" && (
            <TextField
              fullWidth
              label={t("amount") || "Amount"}
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                if (/^[0-9]*$/.test(value)) {
                  setAmount(value);
                }
              }}
              inputMode="numeric"
              placeholder="Ej: 25000"
              sx={{ mt: 2 }}
            />
          )}

          {type === "VARIABLE" && (
            <>

              <TextField
                fullWidth
                label="Cantidad"
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Number(e.target.value) > 0
                      ? Number(e.target.value)
                      : 1
                  )
                }
                sx={{ mt: 2 }}
                helperText="Cantidad mínima: 1"
              />

              <TextField
                fullWidth
                label="Precio Unitario"
                value={unitPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^[0-9]*$/.test(value)) {
                    setUnitPrice(value);
                  }
                }}
                sx={{ mt: 2 }}
                error={!unitPrice}
                helperText={!unitPrice ? "Ingrese precio unitario" : ""}
                inputMode="numeric"
              />

              <TextField
                fullWidth
                type="date"
                label="Fecha Compra"
                InputLabelProps={{ shrink: true }}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                sx={{ mt: 2 }}
              />

              {/* ✅ Total dinámico visible antes de guardar */}
              <Box
                mt={3}
                p={2}
                sx={{
                  backgroundColor: "#f1f5f9",
                  borderRadius: 2,
                }}
              >
                <Typography variant="subtitle2">
                  Total calculado
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={liveTotal > 0 ? "primary" : "text.secondary"}
                >
                  {currencyFormatter.format(liveTotal)}
                </Typography>
              </Box>
            </>
          )}

          <TextField
            select
            fullWidth
            label={t("amountStatus") || "Amount Status"}
            value={formStatus}
            onChange={(e) =>
              setFormStatus(e.target.value as any)
            }
            sx={{ mt: 2 }}
          >
            <MenuItem value="NOT_CONFIRMED">
              Pendiente de Confirmar
            </MenuItem>
            <MenuItem value="CONFIRMED">
              Confirmado
            </MenuItem>
          </TextField>

          {!editing && type === "FIXED" && (
            <TextField
              fullWidth
              label="Cuotas"
              type="number"
              value={installments}
              onChange={(e) =>
                setInstallments(Number(e.target.value))
              }
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            {t("cancel") || "Cancel"}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={
              type === "VARIABLE" && liveTotal <= 0
            }
          >
            {t("save") || "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🔴 Modal Eliminación Mejorado */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle sx={{ color: "error.main", fontWeight: "bold" }}>
          ⚠️ Confirmar Eliminación
        </DialogTitle>

        <DialogContent>
          {deleteTarget && (
            <Box>
              <Typography mb={2}>
                Estás a punto de eliminar el monto del período:
              </Typography>

              <Typography
                fontWeight="bold"
                mb={3}
                sx={{ textTransform: "capitalize" }}
              >
                {monthFormatter(deleteTarget.month, deleteTarget.year, locale)}
              </Typography>

              <TextField
                select
                fullWidth
                label="¿Qué deseas eliminar?"
                value={deleteMode}
                onChange={(e) =>
                  setDeleteMode(e.target.value as any)
                }
              >
                <MenuItem value="ONE">
                  Solo este período
                </MenuItem>
                <MenuItem value="FORWARD">
                  Este período y todos los posteriores
                </MenuItem>
              </TextField>

              <Typography
                variant="body2"
                color="error"
                mt={2}
              >
                Esta acción no se puede deshacer.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t("cancel") || "Cancel"}
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!deleteTarget) return;

              if (deleteMode === "ONE") {
                await deleteSingle({
                  variables: { id: deleteTarget.id },
                });
              } else {
                await deleteFromPeriod({
                  variables: {
                    bill_account_id: selectedAccount.id,
                    year: deleteTarget.year,
                    month: deleteTarget.month,
                  },
                });
              }

              setDeleteDialogOpen(false);
              refetch();
            }}
          >
            {t("delete") || "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
