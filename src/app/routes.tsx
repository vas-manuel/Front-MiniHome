import { lazy, ComponentType, LazyExoticComponent, ReactElement } from "react";
import HomeRounded from "@mui/icons-material/HomeRounded";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import SavingsRounded from "@mui/icons-material/SavingsRounded";
import InsightsRounded from "@mui/icons-material/InsightsRounded";
import AccountTreeRounded from "@mui/icons-material/AccountTreeRounded";
import GroupRounded from "@mui/icons-material/GroupRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import AccountBalanceRounded from "@mui/icons-material/AccountBalanceRounded";
import QueryStatsRounded from "@mui/icons-material/QueryStatsRounded";
import WorkspacePremiumRounded from "@mui/icons-material/WorkspacePremiumRounded";
import StorefrontRounded from "@mui/icons-material/StorefrontRounded";

export interface AppRoute {
  path: string;
  labelKey: string;
  /** Etiqueta corta para la barra inferior móvil */
  shortLabelKey?: string;
  icon: ReactElement;
  /** Permiso requerido (permissions.ts) */
  permission: string;
  section: "month" | "home" | "admin";
  /** Aparece en la barra inferior móvil (máx. 3 + "Más") */
  primaryMobile?: boolean;
  roles?: string[];
  Component: LazyExoticComponent<ComponentType<any>>;
}

const ThisMonthPage = lazy(() => import("../features/thisMonth/ThisMonthPage"));
const DashboardGlobal = lazy(() => import("../DashboardGlobal"));
const BillStructureManager = lazy(() => import("../BillStructureManager"));
const BillAccountsManager = lazy(() => import("../BillAccountsManager"));
const HouseholdUsersManager = lazy(() => import("../HouseholdUsersManager"));
const HouseholdPanel = lazy(() => import("../HouseholdPanel"));
const HouseholdIncomeManager = lazy(() => import("../HouseholdIncomeManager"));
const SavingsManager = lazy(() => import("../SavingsManager"));

const AdminDashboard = lazy(() => import("../AdminDashboard"));
const AdminFinancialDashboard = lazy(() => import("../AdminFinancialDashboard"));
const ExecutiveFinancialDashboard = lazy(() => import("../ExecutiveFinancialDashboard"));
const PlanManager = lazy(() => import("../PlanManager"));
const MerchantManager = lazy(() => import("../MerchantManager"));

/* Hogar: primero "qué tengo que pagar", luego el análisis y la configuración */
export const HOUSEHOLD_ROUTES: AppRoute[] = [
  { path: "/", labelKey: "navHome", icon: <HomeRounded />, permission: "dashboard", section: "month", primaryMobile: true, Component: ThisMonthPage },
  { path: "/bills", labelKey: "navBills", shortLabelKey: "navBillsShort", icon: <ReceiptLongRounded />, permission: "bills", section: "month", primaryMobile: true, Component: BillAccountsManager },
  { path: "/analysis", labelKey: "navAnalysis", icon: <InsightsRounded />, permission: "dashboard", section: "month", primaryMobile: true, Component: DashboardGlobal },
  { path: "/incomes", labelKey: "navIncomes", icon: <TrendingUpRounded />, permission: "householdSettings", section: "month", Component: HouseholdIncomeManager },
  { path: "/savings", labelKey: "navSavings", icon: <SavingsRounded />, permission: "householdSettings", section: "month", Component: SavingsManager },
  { path: "/accounts", labelKey: "navAccounts", shortLabelKey: "navAccountsShort", icon: <AccountTreeRounded />, permission: "accounts", section: "home", Component: BillStructureManager },
  { path: "/users", labelKey: "navMembers", icon: <GroupRounded />, permission: "users", section: "home", Component: HouseholdUsersManager },
  { path: "/settings", labelKey: "navSettings", shortLabelKey: "navSettingsShort", icon: <SettingsRounded />, permission: "householdSettings", section: "home", Component: HouseholdPanel },
];

export const ADMIN_ROUTES: AppRoute[] = [
  { path: "/", labelKey: "navAdminSummary", icon: <DashboardRounded />, permission: "dashboard", section: "admin", primaryMobile: true, Component: AdminDashboard },
  { path: "/financial", labelKey: "navAdminFinance", icon: <AccountBalanceRounded />, permission: "financial", section: "admin", primaryMobile: true, Component: AdminFinancialDashboard },
  { path: "/executive", labelKey: "navAdminExecutive", icon: <QueryStatsRounded />, permission: "executive", section: "admin", primaryMobile: true, Component: ExecutiveFinancialDashboard },
  { path: "/plans", labelKey: "navAdminPlans", icon: <WorkspacePremiumRounded />, permission: "plans", section: "admin", Component: PlanManager },
  { path: "/merchants", labelKey: "navAdminMerchants", icon: <StorefrontRounded />, permission: "plans", section: "admin", roles: ["SYSTEM_ADMIN"], Component: MerchantManager },
];

export const SECTION_LABEL: Record<AppRoute["section"], string> = {
  month: "navSectionMonth",
  home: "navSectionHome",
  admin: "navSectionAdmin",
};

export function routesFor(role: string): AppRoute[] {
  const isAdmin = role === "ADMIN" || role === "SYSTEM_ADMIN";
  const list = isAdmin ? ADMIN_ROUTES : HOUSEHOLD_ROUTES;
  return list.filter((r) => !r.roles || r.roles.includes(role));
}

export function findRoute(routes: AppRoute[], pathname: string) {
  return routes.find((r) => r.path === pathname);
}
