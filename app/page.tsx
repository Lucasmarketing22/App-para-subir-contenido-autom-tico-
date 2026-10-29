"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, MessageSquareReply, Star, Users } from "lucide-react";
import { useApp, useCollection } from "@/lib/app-context";
import { formatDateTime, formatDay, formatMoney, startOfWeekInTz, todayInTz } from "@/lib/locale";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadStatusBadge } from "./crm/status-badge";

function Stat({ label, value, sub, icon: Icon, href }: { label: string; value: string; sub?: string; icon: typeof Users; href: string }) {
  return (
    <Link href={href} className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <Icon className="size-4" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
    </Link>
  );
}

export default function DashboardPage() {
  const { business, t } = useApp();
  const leads = useCollection("leads");
  const reviews = useCollection("reviews");
  const reports = useCollection("ad_reports");
  const social = useCollection("social_posts");
  const gbp = useCollection("gbp_posts");
  if (!business) return null;

  const weekStart = startOfWeekInTz(business).getTime();
  const weekLeads = leads.rows.filter((l) => new Date(l.lead_date).getTime() >= weekStart);
  const weekValue = weekLeads.filter((l) => l.status !== "lost").reduce((s, l) => s + (Number(l.value) || 0), 0);
  const pendingReviews = reviews.rows.filter((r) => r.status === "pending").length;

  const lastReport = reports.rows[0];
  const activeAds = lastReport ? lastReport.campaigns.filter((c) => c.flag !== "pause").length : 0;
  const toPause = lastReport ? lastReport.campaigns.filter((c) => c.flag === "pause").length : 0;

  const today = todayInTz(business.timezone);
  const scheduled = [
    ...social.rows.filter((p) => p.status !== "published" && p.scheduled_for && p.scheduled_for >= today).map((p) => ({ id: p.id, date: p.scheduled_for!, title: p.title, kind: t(`social.type.${p.type}`) })),
    ...gbp.rows.filter((p) => p.status !== "published" && p.scheduled_for && p.scheduled_for >= today).map((p) => ({ id: p.id, date: p.scheduled_for!, title: p.title, kind: "GBP" })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const quick = [
    { href: "/seo#reviews", label: t("dash.q.review"), icon: Star },
    { href: "/crm#sales", label: t("dash.q.sales"), icon: MessageSquareReply },
    { href: "/ads", label: t("dash.q.report"), icon: BarChart3 },
    { href: "/social", label: t("dash.q.calendar"), icon: CalendarDays },
  ];

  return (
    <>
      <PageHeader
        title={business.name}
        subtitle={`${t(`client.type.${business.type}`)} · ${formatDateTime(business, new Date(), { dateStyle: "full", timeStyle: "short" })} (${business.timezone})`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("dash.leadsWeek")} value={String(weekLeads.length)} sub={`${t("dash.pipelineWeek")}: ${formatMoney(business, weekValue)}`} icon={Users} href="/crm" />
        <Stat label={t("dash.pendingReviews")} value={String(pendingReviews)} icon={Star} href="/seo#reviews" />
        <Stat
          label={t("dash.activeAds")}
          value={String(activeAds)}
          sub={lastReport ? `${toPause} ${t("dash.toPause")} · ${t("dash.lastReport")} ${formatDateTime(business, lastReport.created_at, { dateStyle: "short" })}` : t("dash.noReport")}
          icon={BarChart3}
          href="/ads"
        />
        <Stat label={t("dash.scheduled")} value={String(scheduled.length)} sub={scheduled[0] ? `${formatDay(business, scheduled[0].date)} · ${scheduled[0].title}` : undefined} icon={CalendarDays} href="/social" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("dash.recentLeads")} actions={<Link href="/crm" className="text-xs text-muted-foreground hover:text-foreground">CRM →</Link>} />
          <div className="divide-y">
            {leads.rows.slice(0, 6).map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{l.source}</span>
                <LeadStatusBadge status={l.status} />
                <span className="w-24 text-right tabular-nums">{formatMoney(business, l.value)}</span>
                <span className="hidden w-32 text-right text-xs text-muted-foreground md:inline">{formatDateTime(business, l.lead_date, { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
            ))}
            {!leads.loading && leads.rows.length === 0 && <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t("common.empty")}</p>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t("dash.quick")} />
            <div className="grid gap-1 p-2">
              {quick.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-accent">
                  <Icon className="size-4 text-muted-foreground" />
                  {label}
                  <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title={t("dash.upcoming")} />
            <div className="divide-y">
              {scheduled.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">{formatDay(business, p.date)}</span>
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <Badge variant="outline">{p.kind}</Badge>
                </div>
              ))}
              {scheduled.length === 0 && <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t("common.empty")}</p>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
