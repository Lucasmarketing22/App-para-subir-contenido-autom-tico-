"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { BUSINESS_TYPES, type Business } from "@/lib/types";
import { formatDateTime, formatMoney, guessTimeZone } from "@/lib/locale";
import { Combobox } from "./ui/combobox";
import { Field } from "./ui/label";
import { Input } from "./ui/input";
import { NativeSelect } from "./ui/native-select";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { useLocaleOptions } from "./use-locale-options";

export type BusinessCore = Pick<Business, "name" | "type" | "language" | "currency" | "timezone" | "country_code">;

/** Name, type, language, currency, time zone, country — shared by onboarding modal and settings */
export function BusinessCoreFields({ value, onChange }: { value: BusinessCore; onChange: (v: BusinessCore) => void }) {
  const { t, uiLang } = useApp();
  const opts = useLocaleOptions(uiLang);
  const set = <K extends keyof BusinessCore>(k: K, v: BusinessCore[K]) => onChange({ ...value, [k]: v });
  const common = { searchPlaceholder: t("common.search"), emptyText: t("common.noResults") };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t("client.name")} className="sm:col-span-2">
        <Input value={value.name} onChange={(e) => set("name", e.target.value)} autoFocus />
      </Field>
      <Field label={t("client.type")}>
        <NativeSelect value={value.type} onChange={(e) => set("type", e.target.value as Business["type"])}>
          {BUSINESS_TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {t(`client.type.${ty}`)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t("client.language")}>
        <Combobox value={value.language} onChange={(v) => set("language", v)} options={opts.languages} {...common} />
      </Field>
      <Field label={t("client.currency")}>
        <Combobox value={value.currency} onChange={(v) => set("currency", v)} options={opts.currencies} {...common} />
      </Field>
      <Field label={t("client.timezone")}>
        <Combobox value={value.timezone} onChange={(v) => set("timezone", v)} options={opts.timeZones} {...common} />
      </Field>
      <Field label={`${t("client.country")} (${t("common.optional")})`} className="sm:col-span-2">
        <Combobox
          value={value.country_code ?? ""}
          onChange={(v) => set("country_code", v || null)}
          options={opts.countries}
          placeholder="—"
          allowClear
          {...common}
        />
      </Field>
      <LocalePreview value={value} />
    </div>
  );
}

function LocalePreview({ value }: { value: BusinessCore }) {
  const { t } = useApp();
  if (!value.language || !value.currency || !value.timezone) return null;
  const b = value as Business;
  return (
    <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
      {t("client.preview")}: <span className="text-foreground">{formatMoney(b, 1234.5)}</span> ·{" "}
      <span className="text-foreground">{formatDateTime(b, new Date(), { dateStyle: "full", timeStyle: "short" })}</span>
    </div>
  );
}

function emptyCore(): BusinessCore {
  return { name: "", type: "hotel", language: "", currency: "", timezone: guessTimeZone(), country_code: null };
}

export function NewBusinessDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { t, store, reloadBusinesses, setActive, fail } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BusinessCore>(emptyCore);
  const [saving, setSaving] = useState(false);
  const valid = form.name.trim() && form.language && form.currency && form.timezone;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const [created] = await store.insert("businesses", [
        { ...form, name: form.name.trim(), brand_tone: "casual", ad_pause_threshold: 50, knowledge: "" },
      ]);
      await reloadBusinesses();
      setActive(created.id);
      toast.success(t("client.created"));
      setForm(emptyCore());
      setOpen(false);
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="secondary" className="w-full">
            <Plus /> {t("nav.newClient")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={t("client.title.new")}>
        <form onSubmit={submit} className="space-y-4">
          <BusinessCoreFields value={form} onChange={setForm} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {t("client.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
