"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useApp, useCollection } from "@/lib/app-context";
import { runAi } from "@/lib/ai/client";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/locale";
import type { AdReport, Business, Campaign, Recommendation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiButton } from "@/components/ai-button";
import { CopyButton, OutputBlock } from "@/components/copy-button";

/** Deterministic rule: spend above the client's threshold with zero conversions → pause */
function flagCampaigns(b: Business, campaigns: Omit<Campaign, "flag">[]): Campaign[] {
  return campaigns.map((c) => {
    const spend = Number(c.spend) || 0;
    const conversions = Number(c.conversions) || 0;
    return { ...c, spend, conversions, flag: spend > Number(b.ad_pause_threshold) && conversions === 0 ? "pause" : "ok" };
  });
}

const ACTION_VARIANT = { pause: "danger", scale: "success", optimize: "warning", keep: "info" } as const;

function CampaignTable({ b, campaigns }: { b: Business; campaigns: Campaign[] }) {
  const { t } = useApp();
  const total = campaigns.reduce((s, c) => s + c.spend, 0);
  const results = campaigns.reduce((s, c) => s + c.conversions, 0);
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">{t("ads.campaign")}</th>
            <th className="px-3 py-2 font-medium">{t("ads.platform")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("ads.spend")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("ads.results")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("ads.cpr")}</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {campaigns.map((c, i) => (
            <tr key={i} className={cn(c.flag === "pause" && "bg-red-500/5")}>
              <td className="px-3 py-2 font-medium">{c.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{c.platform}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatMoney(b, c.spend)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatNumber(b, c.conversions)} <span className="text-xs text-muted-foreground">{c.conversion_label}</span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{c.conversions ? formatMoney(b, c.spend / c.conversions) : "—"}</td>
              <td className="px-3 py-2 text-right">
                {c.flag === "pause" && (
                  <Badge variant="danger">
                    <AlertTriangle className="size-3" /> {t("ads.pause")}
                  </Badge>
                )}
              </td>
            </tr>
          ))}
          <tr className="bg-accent/30 font-medium">
            <td className="px-3 py-2" colSpan={2}>
              {t("ads.total")}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{formatMoney(b, total)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatNumber(b, results)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{results ? formatMoney(b, total / results) : "—"}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ReportView({ report }: { report: AdReport }) {
  const { business, t } = useApp();
  if (!business) return null;
  return (
    <div className="space-y-3">
      <CampaignTable b={business} campaigns={report.campaigns} />
      {report.recommendations?.length > 0 && (
        <div className="rounded-md border">
          <div className="border-b px-3 py-1.5 text-xs font-medium text-muted-foreground">{t("ads.recs")}</div>
          <div className="divide-y">
            {report.recommendations.map((r: Recommendation, i) => (
              <div key={i} className="flex gap-3 px-3 py-2 text-sm">
                <Badge variant={ACTION_VARIANT[r.action] ?? "default"} className="mt-0.5 h-fit w-20 justify-center">
                  {t(`ads.action.${r.action}`)}
                </Badge>
                <div className="min-w-0">
                  <div className="font-medium">{r.campaign}</div>
                  <div className="text-muted-foreground">{r.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <OutputBlock title={`${t("ads.report")}${report.period ? ` · ${report.period}` : ""}`} text={report.report} />
    </div>
  );
}

function ReportCard() {
  const { business, t, fail } = useApp();
  const reports = useCollection("ad_reports");
  const [raw, setRaw] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"idle" | "extract" | "write">("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!business) return null;

  async function run() {
    try {
      setStep("extract");
      const ex = await runAi<{ period: string; campaigns: Omit<Campaign, "flag">[] }>("ads_extract", business!, { raw });
      const campaigns = flagCampaigns(business!, ex.campaigns ?? []);
      if (!campaigns.length) {
        fail(new Error(t("ads.noData")));
        return;
      }
      setStep("write");
      const rep = await runAi<{ report: string; recommendations: Recommendation[] }>("ads_report", business!, { campaigns, period: ex.period, notes });
      // Enforce the rule even if the model disagrees
      const recs = rep.recommendations ?? [];
      for (const c of campaigns.filter((c) => c.flag === "pause")) {
        const r = recs.find((r) => r.campaign === c.name);
        if (r) r.action = "pause";
        else recs.unshift({ campaign: c.name, action: "pause", reason: t("ads.rule", { x: formatMoney(business!, business!.ad_pause_threshold) }) });
      }
      const [saved] = await reports.insert([
        { raw_input: raw, period: ex.period ?? "", campaigns, recommendations: recs, report: rep.report ?? "", total_spend: campaigns.reduce((s, c) => s + c.spend, 0) },
      ]);
      if (saved) setSelectedId(saved.id);
    } catch (e) {
      fail(e);
    } finally {
      setStep("idle");
    }
  }

  const selected = reports.rows.find((r) => r.id === selectedId) ?? null;

  return (
    <Card>
      <CardHeader
        title={t("ads.data")}
        description={
          <Link href="/settings" className="hover:text-foreground">
            {t("ads.rule", { x: formatMoney(business, business.ad_pause_threshold) })}
          </Link>
        }
      />
      <CardContent className="space-y-3">
        <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={t("ads.dataPh")} rows={7} className="font-mono text-xs" />
        <Field label={`${t("ads.notes")} (${t("common.optional")})`}>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <AiButton onClick={run} loading={step !== "idle"} loadingText={step === "extract" ? t("ads.extracting") : t("ads.writing")} disabled={!raw.trim()}>
          {t("ads.analyzeBtn")}
        </AiButton>

        {selected && <ReportView report={selected} />}

        {reports.rows.length > 0 && (
          <div className="pt-2">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">{t("common.history")}</div>
            <div className="divide-y rounded-md border">
              {reports.rows.map((r) => (
                <div key={r.id} className={cn("flex items-center gap-2 px-3 py-2 text-sm", selectedId === r.id && "bg-accent/50")}>
                  <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setSelectedId(r.id)}>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(business, r.created_at, { dateStyle: "short", timeStyle: "short" })}</span>
                    <span className="truncate">{r.period || r.campaigns.map((c) => c.name).join(", ")}</span>
                  </button>
                  <span className="tabular-nums">{formatMoney(business, r.total_spend)}</span>
                  {r.campaigns.some((c) => c.flag === "pause") && <AlertTriangle className="size-3.5 text-red-400" />}
                  <Button size="xs" variant="ghost" onClick={() => confirm(t("common.confirmDelete")) && reports.remove(r.id)}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AdCopy {
  angle: string;
  hook: string;
  benefit: string;
  cta: string;
  headline: string;
  full_text: string;
}

function CopiesCard() {
  const { business, t, fail } = useApp();
  const [offer, setOffer] = useState("");
  const [audience, setAudience] = useState("");
  const [platform, setPlatform] = useState("Meta Ads (Facebook/Instagram)");
  const [loading, setLoading] = useState(false);
  const [copies, setCopies] = useState<AdCopy[]>([]);
  if (!business) return null;

  async function run() {
    setLoading(true);
    try {
      const res = await runAi<{ copies: AdCopy[] }>("ad_copies", business!, { offer, audience, platform });
      setCopies(res.copies ?? []);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title={t("ads.copies")}
        actions={copies.length > 0 && <CopyButton text={() => copies.map((c, i) => `#${i + 1} ${c.headline}\n${c.full_text}`).join("\n\n---\n\n")} label={t("common.copyAll")} />}
      />
      <CardContent className="space-y-3">
        <Field label={t("ads.offer")}>
          <Textarea value={offer} onChange={(e) => setOffer(e.target.value)} placeholder={t("ads.offerPh")} rows={3} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("ads.platformSel")}>
            <NativeSelect value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option>Meta Ads (Facebook/Instagram)</option>
              <option>Google Ads (Search)</option>
              <option>Google Ads (Performance Max)</option>
              <option>TikTok Ads</option>
            </NativeSelect>
          </Field>
          <Field label={`${t("ads.audience")} (${t("common.optional")})`}>
            <Input value={audience} onChange={(e) => setAudience(e.target.value)} />
          </Field>
        </div>
        <AiButton onClick={run} loading={loading} loadingText={t("common.generating")} disabled={!offer.trim()}>
          {t("ads.copiesBtn")}
        </AiButton>
        <div className="space-y-2">
          {copies.map((c, i) => (
            <div key={i} className="rounded-md border bg-background/40">
              <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
                <span className="flex min-w-0 items-center gap-2 text-xs">
                  <Badge variant="primary">{c.angle}</Badge>
                  <span className="truncate font-medium">{c.headline}</span>
                </span>
                <div className="flex gap-1">
                  <CopyButton text={c.headline} label="Headline" variant="ghost" />
                  <CopyButton text={c.full_text} />
                </div>
              </div>
              <div className="space-y-1.5 px-3 py-2.5 text-sm">
                <p>
                  <span className="text-xs text-muted-foreground">Hook · </span>
                  {c.hook}
                </p>
                <p>
                  <span className="text-xs text-muted-foreground">Benefit · </span>
                  {c.benefit}
                </p>
                <p>
                  <span className="text-xs text-muted-foreground">CTA · </span>
                  {c.cta}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdsPage() {
  const { t } = useApp();
  return (
    <>
      <PageHeader title={t("ads.title")} />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ReportCard />
        <CopiesCard />
      </div>
    </>
  );
}
