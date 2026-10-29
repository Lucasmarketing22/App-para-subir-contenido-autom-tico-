"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Eye, EyeOff, Upload } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { OPENAI_KEY_STORAGE } from "@/lib/ai/client";
import { exportLocalData, hasSupabase, importLocalData } from "@/lib/data/store";
import { currencySymbol } from "@/lib/locale";
import { UI_LANGS } from "@/lib/i18n";
import { BRAND_TONES, type Business } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { BusinessCoreFields, type BusinessCore } from "@/components/business-form";
import { languageName } from "@/lib/locale";

type Editable = BusinessCore & Pick<Business, "brand_tone" | "ad_pause_threshold" | "knowledge">;

function pick(b: Business): Editable {
  return {
    name: b.name,
    type: b.type,
    language: b.language,
    currency: b.currency,
    timezone: b.timezone,
    country_code: b.country_code,
    brand_tone: b.brand_tone,
    ad_pause_threshold: b.ad_pause_threshold,
    knowledge: b.knowledge ?? "",
  };
}

function ClientSettings({ business }: { business: Business }) {
  const { t, store, reloadBusinesses, fail } = useApp();
  const [form, setForm] = useState<Editable>(() => pick(business));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(pick(business));

  async function save() {
    if (!form.name.trim() || !form.language || !form.currency || !form.timezone) return toast.error(t("common.required"));
    setSaving(true);
    try {
      await store.update("businesses", business.id, { ...form, ad_pause_threshold: Number(form.ad_pause_threshold) || 0 });
      await reloadBusinesses();
      toast.success(t("common.saved"));
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`${t("set.deleteClient")}: ${business.name}. ${t("common.confirmDelete")}`)) return;
    try {
      await store.remove("businesses", business.id);
      await reloadBusinesses();
    } catch (e) {
      fail(e);
    }
  }

  return (
    <>
      <Card>
        <CardHeader title={`${t("set.client")}: ${business.name}`} description={t("set.locale")} actions={<Button size="sm" onClick={save} disabled={!dirty || saving}>{t("common.save")}</Button>} />
        <CardContent>
          <BusinessCoreFields value={form} onChange={(core) => setForm((f) => ({ ...f, ...core }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("set.tone")} description={t("set.toneHint")} />
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BRAND_TONES.map((tone) => (
            <button
              key={tone}
              onClick={() => setForm((f) => ({ ...f, brand_tone: tone }))}
              className={cn("rounded-md border px-3 py-2.5 text-sm hover:bg-accent", form.brand_tone === tone && "border-primary bg-primary/10 text-primary")}
            >
              {t(`set.tone.${tone}`)}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("set.knowledge")} description={t("set.knowledgeHint")} />
        <CardContent>
          <Textarea value={form.knowledge} onChange={(e) => setForm((f) => ({ ...f, knowledge: e.target.value }))} rows={9} placeholder={t("set.knowledgePh")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("set.threshold")} description={t("set.thresholdHint")} />
        <CardContent className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            step="any"
            className="max-w-[180px]"
            value={form.ad_pause_threshold}
            onChange={(e) => setForm((f) => ({ ...f, ad_pause_threshold: e.target.value as unknown as number }))}
          />
          <span className="text-sm text-muted-foreground">
            {form.currency} {currencySymbol(form.currency)}
          </span>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="destructive" size="sm" onClick={remove}>
          {t("set.deleteClient")}
        </Button>
        <Button onClick={save} disabled={!dirty || saving}>
          {t("common.save")}
        </Button>
      </div>
    </>
  );
}

function AppSettings() {
  const { t, uiLang, setUiLang, reloadBusinesses, fail } = useApp();
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setKey(localStorage.getItem(OPENAI_KEY_STORAGE) ?? "");
    } catch {}
  }, []);

  function saveKey() {
    try {
      if (key.trim()) localStorage.setItem(OPENAI_KEY_STORAGE, key.trim());
      else localStorage.removeItem(OPENAI_KEY_STORAGE);
      toast.success(t("common.saved"));
    } catch (e) {
      fail(e);
    }
  }

  function download() {
    const blob = new Blob([exportLocalData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `my-work-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function upload(file: File) {
    try {
      importLocalData(await file.text());
      await reloadBusinesses();
      toast.success(t("set.imported"));
      location.reload();
    } catch (e) {
      fail(e);
    }
  }

  return (
    <>
      <Card>
        <CardHeader title={t("set.openai")} description={t("set.openaiHint")} />
        <CardContent className="flex gap-2">
          <div className="relative flex-1">
            <Input type={show ? "text" : "password"} value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-..." autoComplete="off" className="pr-9" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <Button onClick={saveKey}>{t("common.save")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("set.app")} />
        <CardContent className="space-y-4">
          <Field label={t("set.uiLang")}>
            <NativeSelect value={uiLang} onChange={(e) => setUiLang(e.target.value)} className="max-w-[240px]">
              {UI_LANGS.map((l) => (
                <option key={l} value={l}>
                  {languageName(l, l)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {!hasSupabase && (
            <Field label={t("set.backup")}>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={download}>
                  <Download /> {t("set.export")}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload /> {t("set.import")}
                </Button>
                <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </div>
            </Field>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function SettingsPage() {
  const { t, business } = useApp();
  return (
    <>
      <PageHeader title={t("set.title")} />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">{business ? <ClientSettings key={business.id} business={business} /> : null}</div>
        <div className="space-y-4">
          <AppSettings />
        </div>
      </div>
    </>
  );
}
