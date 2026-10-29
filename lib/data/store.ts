import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TableMap, TableName } from "../types";
import { uid } from "../utils";

type Row<T extends TableName> = TableMap[T];
type NewRow<T extends TableName> = Omit<Row<T>, "id" | "created_at"> & Partial<Pick<Row<T>, "id" | "created_at">>;

export interface DataStore {
  kind: "supabase" | "local";
  list<T extends TableName>(table: T, match?: Partial<Row<T>>): Promise<Row<T>[]>;
  insert<T extends TableName>(table: T, rows: NewRow<T>[]): Promise<Row<T>[]>;
  update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>): Promise<Row<T>>;
  remove<T extends TableName>(table: T, id: string): Promise<void>;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase) return null;
  if (!client) client = createClient(SUPABASE_URL!, SUPABASE_KEY!);
  return client;
}

const byNewest = (a: { created_at: string }, b: { created_at: string }) => (a.created_at < b.created_at ? 1 : -1);

/* ---------- localStorage fallback ---------- */
const LS_PREFIX = "mwos:";

function readTable<T>(table: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(LS_PREFIX + table) || "[]");
  } catch {
    return [];
  }
}
function writeTable<T>(table: string, rows: T[]) {
  localStorage.setItem(LS_PREFIX + table, JSON.stringify(rows));
}

export const localStore: DataStore = {
  kind: "local",
  async list(table, match) {
    const rows = readTable<Row<typeof table>>(table);
    const entries = Object.entries(match ?? {});
    return rows
      .filter((r) => entries.every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v))
      .sort(byNewest) as never;
  },
  async insert(table, rows) {
    const now = Date.now();
    const created = rows.map((r, i) => ({
      ...r,
      id: r.id ?? uid(),
      // Keep insertion order stable for batch inserts
      created_at: r.created_at ?? new Date(now - i).toISOString(),
    }));
    writeTable(table, [...created, ...readTable(table)]);
    return created as never;
  },
  async update(table, id, patch) {
    const rows = readTable<{ id: string }>(table);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Not found");
    rows[idx] = { ...rows[idx], ...patch };
    writeTable(table, rows);
    return rows[idx] as never;
  },
  async remove(table, id) {
    writeTable(table, readTable<{ id: string }>(table).filter((r) => r.id !== id));
    if (table === "businesses") {
      // Emulate ON DELETE CASCADE
      for (const t of ["leads", "reviews", "gbp_posts", "ad_reports", "social_posts"]) {
        writeTable(t, readTable<{ business_id: string }>(t).filter((r) => r.business_id !== id));
      }
    }
  },
};

/* ---------- Supabase ---------- */
function supabaseStore(sb: SupabaseClient): DataStore {
  return {
    kind: "supabase",
    async list(table, match) {
      let q = sb.from(table).select("*").order("created_at", { ascending: false });
      if (match && Object.keys(match).length) q = q.match(match as Record<string, unknown>);
      const { data, error } = await q;
      if (error) throw error;
      return data as never;
    },
    async insert(table, rows) {
      const { data, error } = await sb.from(table).insert(rows as never).select("*");
      if (error) throw error;
      return data as never;
    },
    async update(table, id, patch) {
      const { data, error } = await sb.from(table).update(patch as never).eq("id", id).select("*").single();
      if (error) throw error;
      return data as never;
    },
    async remove(table, id) {
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) throw error;
    },
  };
}

export function getStore(): DataStore {
  const sb = getSupabase();
  return sb ? supabaseStore(sb) : localStore;
}

/** Full JSON backup of the local data (useful before migrating to Supabase) */
export function exportLocalData(): string {
  const out: Record<string, unknown> = {};
  for (const t of ["businesses", "leads", "reviews", "gbp_posts", "ad_reports", "social_posts"]) out[t] = readTable(t);
  return JSON.stringify(out, null, 2);
}

export function importLocalData(json: string) {
  const data = JSON.parse(json) as Record<string, unknown[]>;
  for (const [t, rows] of Object.entries(data)) if (Array.isArray(rows)) writeTable(t, rows);
}
