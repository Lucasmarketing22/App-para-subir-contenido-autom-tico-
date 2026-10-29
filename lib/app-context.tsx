"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { getStore, getSupabase, hasSupabase, type DataStore } from "./data/store";
import { translate, type I18nKey } from "./i18n";
import type { Business, TableMap, TableName } from "./types";
import { AiError } from "./ai/client";

const ACTIVE_KEY = "mwos:active_business";
const UI_LANG_KEY = "mwos:ui_lang";

interface AppState {
  ready: boolean;
  session: Session | null;
  needsAuth: boolean;
  store: DataStore;
  businesses: Business[];
  business: Business | null;
  setActive: (id: string) => void;
  reloadBusinesses: () => Promise<void>;
  uiLang: string;
  setUiLang: (l: string) => void;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
  /** Shows a toast for any error (AI or data) */
  fail: (e: unknown) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getStore(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(!hasSupabase);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [uiLang, setUiLangState] = useState("es");

  const t = useCallback((key: I18nKey, vars?: Record<string, string | number>) => translate(uiLang, key, vars), [uiLang]);

  useEffect(() => {
    try {
      const l = localStorage.getItem(UI_LANG_KEY);
      if (l) setUiLangState(l);
      else if (!navigator.language.toLowerCase().startsWith("es")) setUiLangState("en");
      setActiveId(localStorage.getItem(ACTIVE_KEY));
    } catch {}
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const needsAuth = hasSupabase && authChecked && !session;

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof AiError && e.code === "NO_API_KEY") toast.error(t("common.noKey"));
      else toast.error(e instanceof Error ? e.message : (e as { message?: string })?.message || t("common.error"));
      console.error(e);
    },
    [t],
  );

  const reloadBusinesses = useCallback(async () => {
    try {
      const list = await store.list("businesses");
      setBusinesses(list);
    } catch (e) {
      fail(e);
    } finally {
      setLoaded(true);
    }
  }, [store, fail]);

  useEffect(() => {
    if (!authChecked || needsAuth) return;
    reloadBusinesses();
  }, [authChecked, needsAuth, reloadBusinesses, session?.user?.id]);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch {}
  }, []);

  const setUiLang = useCallback((l: string) => {
    setUiLangState(l);
    try {
      localStorage.setItem(UI_LANG_KEY, l);
    } catch {}
  }, []);

  const business = businesses.find((b) => b.id === activeId) ?? businesses[businesses.length - 1] ?? null;

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = uiLang;
  }, [uiLang]);

  const value: AppState = {
    ready: authChecked && (needsAuth || loaded),
    session,
    needsAuth,
    store,
    businesses,
    business,
    setActive,
    reloadBusinesses,
    uiLang,
    setUiLang,
    t,
    fail,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

/** Loads rows of a table for the active business, with simple reload/optimistic helpers. */
export function useCollection<T extends Exclude<TableName, "businesses">>(table: T) {
  const { store, business, fail } = useApp();
  const [rows, setRows] = useState<TableMap[T][]>([]);
  const [loading, setLoading] = useState(true);
  const businessId = business?.id;

  const reload = useCallback(async () => {
    if (!businessId) {
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      const list = await store.list(table, { business_id: businessId } as Partial<TableMap[T]>);
      setRows(list);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [store, table, businessId, fail]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  const insert = useCallback(
    async (items: Omit<TableMap[T], "id" | "created_at" | "business_id">[]) => {
      if (!businessId) return [];
      try {
        const created = await store.insert(table, items.map((i) => ({ ...i, business_id: businessId })) as never);
        setRows((prev) => [...created, ...prev]);
        return created;
      } catch (e) {
        fail(e);
        return [];
      }
    },
    [store, table, businessId, fail],
  );

  const update = useCallback(
    async (id: string, patch: Partial<TableMap[T]>) => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      try {
        await store.update(table, id, patch);
      } catch (e) {
        fail(e);
        reload();
      }
    },
    [store, table, fail, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      setRows((prev) => prev.filter((r) => r.id !== id));
      try {
        await store.remove(table, id);
      } catch (e) {
        fail(e);
        reload();
      }
    },
    [store, table, fail, reload],
  );

  return { rows, loading, reload, insert, update, remove };
}
