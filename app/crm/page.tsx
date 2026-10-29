"use client";

import { useState } from "react";
import { MessageCirclePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp, useCollection } from "@/lib/app-context";
import { runAi } from "@/lib/ai/client";
import { currencySymbol, formatDateTime, formatMoney, fromLocalInput, toLocalInput } from "@/lib/locale";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AiButton } from "@/components/ai-button";
import { OutputBlock } from "@/components/copy-button";

type LeadForm = Omit<Lead, "id" | "created_at" | "business_id">;

function LeadDialog({ open, onOpenChange, initial, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; initial: LeadForm; onSave: (l: LeadForm) => void }) {
  const { business, t } = useApp();
  const [form, setForm] = useState<LeadForm>(initial);
  if (!business) return null;
  const set = <K extends keyof LeadForm>(k: K, v: LeadForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={initial.name ? t("common.edit") : t("crm.newLead")}>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            onSave({ ...form, name: form.name.trim(), value: Number(form.value) || 0 });
            onOpenChange(false);
          }}
        >
          <Field label={t("crm.name")}>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus required />
          </Field>
          <Field label={t("crm.source")}>
            <Input value={form.source} onChange={(e) => set("source", e.target.value)} placeholder={t("crm.sourcePh")} />
          </Field>
          <Field label={t("crm.status")}>
            <NativeSelect value={form.status} onChange={(e) => set("status", e.target.value as LeadStatus)}>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`crm.status.${s}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={`${t("crm.value")} (${business.currency} ${currencySymbol(business.currency)})`}>
            <Input type="number" step="any" min="0" value={form.value || ""} onChange={(e) => set("value", e.target.value as unknown as number)} />
          </Field>
          <Field label={`${t("crm.date")} (${business.timezone})`}>
            <Input type="datetime-local" value={toLocalInput(form.lead_date, business.timezone)} onChange={(e) => e.target.value && set("lead_date", fromLocalInput(e.target.value, business.timezone))} />
          </Field>
          <Field label={t("crm.contact")}>
            <Input value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="+.. / email / @user" />
          </Field>
          <Field label={t("crm.notes")} className="sm:col-span-2">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("common.save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LeadsCard({ onFollowUp }: { onFollowUp: (l: Lead) => void }) {
  const { business, t } = useApp();
  const leads = useCollection("leads");
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [editing, setEditing] = useState<{ id: string | null; form: LeadForm } | null>(null);
  if (!business) return null;

  const blank = (): LeadForm => ({ name: "", source: "", status: "new", value: 0, contact: "", notes: "", lead_date: new Date().toISOString() });
  const rows = filter === "all" ? leads.rows : leads.rows.filter((l) => l.status === filter);
  const total = rows.filter((l) => l.status !== "lost").reduce((s, l) => s + (Number(l.value) || 0), 0);
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, leads.rows.filter((l) => l.status === s).length]));

  return (
    <Card>
      <CardHeader
        title={t("crm.leads")}
        description={`${t("crm.total")}: ${formatMoney(business, total)}`}
        actions={
          <Button size="sm" onClick={() => setEditing({ id: null, form: blank() })}>
            <Plus /> {t("crm.newLead")}
          </Button>
        }
      />
      <div className="flex gap-1 overflow-x-auto border-b px-3 py-2">
        {(["all", ...LEAD_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn("whitespace-nowrap rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent", filter === s && "bg-accent text-foreground")}
          >
            {s === "all" ? `${t("crm.all")} ${leads.rows.length}` : `${t(`crm.status.${s}`)} ${counts[s]}`}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">{t("crm.name")}</th>
              <th className="px-3 py-2 font-medium">{t("crm.source")}</th>
              <th className="px-3 py-2 font-medium">{t("crm.status")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("crm.value")}</th>
              <th className="px-3 py-2 font-medium">{t("crm.date")}</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((l) => (
              <tr key={l.id} className="hover:bg-accent/30">
                <td className="px-3 py-2">
                  <div className="font-medium">{l.name}</div>
                  {l.contact && <div className="text-xs text-muted-foreground">{l.contact}</div>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{l.source}</td>
                <td className="px-3 py-1.5">
                  <NativeSelect value={l.status} onChange={(e) => leads.update(l.id, { status: e.target.value as LeadStatus })} className="w-32">
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`crm.status.${s}`)}
                      </option>
                    ))}
                  </NativeSelect>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(business, l.value)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDateTime(business, l.lead_date, { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-2 py-2">
                  <div className="flex justify-end">
                    <Button size="icon" variant="ghost" title={t("crm.followup")} onClick={() => onFollowUp(l)}>
                      <MessageCirclePlus />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() =>
                        setEditing({
                          id: l.id,
                          form: { name: l.name, source: l.source, status: l.status, value: l.value, contact: l.contact, notes: l.notes, lead_date: l.lead_date },
                        })
                      }
                    >
                      <Pencil />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm(t("common.confirmDelete")) && leads.remove(l.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!leads.loading && rows.length === 0 && <p className="px-4 py-8 text-center text-xs text-muted-foreground">{t("common.empty")}</p>}
      </div>
      {editing && (
        <LeadDialog
          key={editing.id ?? "new"}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          initial={editing.form}
          onSave={(form) => {
            if (editing.id) leads.update(editing.id, form);
            else leads.insert([form]);
          }}
        />
      )}
    </Card>
  );
}

function SalesCard() {
  const { business, t, fail } = useApp();
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<{ reply: string; alt_short: string; missing_info: string[] } | null>(null);
  if (!business) return null;

  async function run() {
    setLoading(true);
    try {
      setRes(await runAi("sales_reply", business!, { message, context }));
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card id="sales">
      <CardHeader title={t("crm.sales")} />
      <CardContent className="space-y-3">
        <Field label={t("crm.salesMsg")}>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("crm.salesPh")} rows={4} />
        </Field>
        <Field label={`${t("crm.salesCtx")} (${t("common.optional")})`}>
          <Input value={context} onChange={(e) => setContext(e.target.value)} />
        </Field>
        <AiButton onClick={run} loading={loading} loadingText={t("common.generating")} disabled={!message.trim()}>
          {t("crm.salesBtn")}
        </AiButton>
        {res && (
          <div className="space-y-2">
            <OutputBlock title={t("crm.sales")} text={res.reply} />
            {res.alt_short && <OutputBlock title={t("crm.short")} text={res.alt_short} />}
            {res.missing_info?.length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
                <div className="mb-1 font-medium text-amber-400">{t("crm.missing")}</div>
                <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                  {res.missing_info.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FollowUpCard({ context, setContext }: { context: string; setContext: (s: string) => void }) {
  const { business, t, fail } = useApp();
  const [history, setHistory] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{ label: string; message: string }[]>([]);
  if (!business) return null;

  async function run() {
    setLoading(true);
    try {
      const res = await runAi<{ options: { label: string; message: string }[] }>("follow_up", business!, { context, history });
      setOptions(res.options ?? []);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card id="followup">
      <CardHeader title={t("crm.followup")} />
      <CardContent className="space-y-3">
        <Field label={t("crm.followCtx")}>
          <Textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder={t("crm.followPh")} rows={3} />
        </Field>
        <Field label={`${t("crm.followHistory")} (${t("common.optional")})`}>
          <Textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={3} />
        </Field>
        <AiButton onClick={run} loading={loading} loadingText={t("common.generating")} disabled={!context.trim()}>
          {t("crm.followBtn")}
        </AiButton>
        {options.map((o, i) => (
          <OutputBlock key={i} title={o.label} text={o.message} />
        ))}
      </CardContent>
    </Card>
  );
}

export default function CrmPage() {
  const { business, t } = useApp();
  const [followCtx, setFollowCtx] = useState("");
  if (!business) return null;

  return (
    <>
      <PageHeader title={t("crm.title")} />
      <div className="space-y-4">
        <LeadsCard
          onFollowUp={(l) => {
            const when = formatDateTime(business, l.lead_date, { dateStyle: "medium" });
            setFollowCtx(
              [`${l.name}${l.source ? ` (${l.source})` : ""} — ${when} — ${t(`crm.status.${l.status}`)}`, l.value ? formatMoney(business, l.value) : "", l.notes]
                .filter(Boolean)
                .join("\n"),
            );
            document.getElementById("followup")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <SalesCard />
          <FollowUpCard context={followCtx} setContext={setFollowCtx} />
        </div>
      </div>
    </>
  );
}
