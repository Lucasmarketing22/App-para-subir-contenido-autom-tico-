"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import { getSupabase } from "@/lib/data/store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field } from "./ui/label";

export function AuthScreen() {
  const { t, fail } = useApp();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) toast.success(t("auth.checkEmail"));
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">OS</div>
          <h1 className="text-base font-semibold">{t("auth.title")}</h1>
        </div>
        <Field label={t("auth.email")}>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label={t("auth.password")}>
          <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "in" ? t("auth.signIn") : t("auth.signUp")}
        </Button>
        <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? t("auth.toggleSignUp") : t("auth.toggleSignIn")}
        </button>
      </form>
    </div>
  );
}
