import type { AiTask } from "./prompts";
import type { Business } from "../types";

export const OPENAI_KEY_STORAGE = "mwos:openai_key";

export class AiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}

export async function runAi<T = unknown>(task: AiTask, business: Business, input: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const key = localStorage.getItem(OPENAI_KEY_STORAGE);
    if (key) headers["x-openai-key"] = key;
  } catch {}

  const res = await fetch("/api/ai", { method: "POST", headers, body: JSON.stringify({ task, business, input }) });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok || data.error) throw new AiError(data.error || `HTTP ${res.status}`, data.error === "NO_API_KEY" ? "NO_API_KEY" : undefined);
  return data.result as T;
}
