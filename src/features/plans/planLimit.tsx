/* Errores de límite del plan (código PLAN_LIMIT del backend) y aviso con enlace a Planes */
import { Alert, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../i18n";

export const PLANS_PATH = "/planes";

export const gqlErrorCode = (err: any): string | undefined => err?.graphQLErrors?.[0]?.extensions?.code;

export const isPlanLimitError = (err: any) => gqlErrorCode(err) === "PLAN_LIMIT";

/* Nombre para mostrar de un plan del catálogo (GRATIS, HOGAR, FAMILIA) */
export function usePlanLabel() {
  const { t } = useLanguage();
  return (name?: string | null) => {
    if (!name) return t("planLabelGRATIS");
    const key = `planLabel${name.toUpperCase()}`;
    const label = t(key);
    return label === key ? name : label;
  };
}

export function PlanLimitAlert({ message, onClose }: { message: string; onClose?: () => void }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  return (
    <Alert
      severity="warning"
      onClose={onClose}
      action={
        <Button color="inherit" size="small" onClick={() => navigate(PLANS_PATH)}>
          {t("seePlans")}
        </Button>
      }
    >
      {message}
    </Alert>
  );
}
