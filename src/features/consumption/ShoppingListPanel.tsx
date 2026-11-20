/* Lista de compras sugerida según la frecuencia con que se compra cada producto */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import { useLanguage } from "../../i18n";
import { EmptyState } from "../../components/common";
import { formatNumber } from "./purchaseForm";
import { SHOPPING_SUGGESTIONS, ShoppingSuggestion } from "./queries";
import { checkKey, listAsText, loadChecked, saveChecked } from "./shoppingList";

export function ShoppingListPanel({ onOpenProduct, onCopied }: { onOpenProduct: (p: { productName: string; unit: string }) => void; onCopied: () => void }) {
  const { t, money } = useLanguage();
  const { data, loading, error } = useQuery<{ shoppingSuggestions: ShoppingSuggestion[] }>(SHOPPING_SUGGESTIONS, {
    fetchPolicy: "cache-and-network",
  });
  const items = data?.shoppingSuggestions ?? [];
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked());

  useEffect(() => {
    if (data) saveChecked(checked, items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, data]);

  const groups = useMemo(() => {
    const map = new Map<string, ShoppingSuggestion[]>();
    items.forEach((i) => map.set(i.category.name, [...(map.get(i.category.name) ?? []), i]));
    return [...map.entries()];
  }, [items]);

  const toggle = (s: ShoppingSuggestion) =>
    setChecked((prev) => {
      const next = new Set(prev);
      const k = checkKey(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(listAsText(items, checked, t("shoppingListTitle")));
      onCopied();
    } catch {
      /* sin portapapeles: no hacemos nada */
    }
  };

  if (loading && !data) return <LinearProgress />;
  if (error) return <Alert severity="error">{t("genericError")}</Alert>;
  if (!items.length) {
    return (
      <Paper>
        <EmptyState title={t("shoppingListEmpty")} description={t("shoppingListEmptyHint")} />
      </Paper>
    );
  }

  const pendingCount = items.filter((i) => !checked.has(checkKey(i))).length;

  return (
    <Paper sx={{ p: { xs: 1, sm: 2 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ px: 1, mb: 1 }}>
        <Box>
          <Typography fontWeight={600}>{t("shoppingListCount", { count: pendingCount })}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t("shoppingListHint")}
          </Typography>
        </Box>
        <Button startIcon={<ContentCopyRounded />} onClick={copy} disabled={!pendingCount}>
          {t("shoppingListCopy")}
        </Button>
      </Stack>

      {groups.map(([category, list]) => (
        <List key={category} dense subheader={<ListSubheader disableSticky>{category}</ListSubheader>}>
          {list.map((s) => {
            const done = checked.has(checkKey(s));
            const overdue = s.urgency >= 1;
            return (
              <ListItem
                key={s.key}
                disablePadding
                secondaryAction={
                  <Chip
                    size="small"
                    color={overdue ? "warning" : "default"}
                    variant={overdue ? "filled" : "outlined"}
                    label={overdue ? t("shoppingListDue") : t("shoppingListSoon")}
                  />
                }
              >
                <ListItemIcon sx={{ minWidth: 40, pl: 1 }}>
                  <Checkbox edge="start" checked={done} onChange={() => toggle(s)} inputProps={{ "aria-label": s.productName }} />
                </ListItemIcon>
                <ListItemButton onClick={() => onOpenProduct({ productName: s.productName, unit: s.unit })} sx={{ pr: 12 }}>
                  <ListItemText
                    primary={`${s.productName} · ${formatNumber(s.usualQuantity)} ${s.unit}`}
                    primaryTypographyProps={{ sx: done ? { textDecoration: "line-through", color: "text.secondary" } : undefined }}
                    secondary={[
                      t("shoppingListEvery", { days: Math.round(s.averageDaysBetween), since: s.daysSinceLast }),
                      s.bestMerchant && s.bestUnitPrice !== null
                        ? t("shoppingListBest", { merchant: s.bestMerchant, price: money(s.bestUnitPrice), unit: s.unit })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      ))}
    </Paper>
  );
}
