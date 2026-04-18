export const formatCurrency = (value: number | null | undefined) => {
  const safeValue = Number(value || 0);

  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safeValue);
};
