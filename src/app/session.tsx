import { createContext, useContext } from "react";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  household?: {
    id?: string;
    name?: string | null;
    language?: string | null;
    currency?: string | null;
    plan?: { name: string } | null;
  } | null;
}

export interface Session {
  user: SessionUser;
  permissions: string[];
  isAdmin: boolean;
  plan: string;
  can: (permission: string) => boolean;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession debe usarse dentro de SessionContext");
  return s;
}
