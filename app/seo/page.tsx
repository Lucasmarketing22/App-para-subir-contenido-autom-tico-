"use client";

import { useState } from "react";
import { Check, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp, useCollection } from "@/lib/app-context";
import { runAi } from "@/lib/ai/client";
import { addDaysYmd, formatDateTime, formatDay, languageName, todayInTz } from "@/lib/locale";
import { cn } from "@/lib/utils";
import type { Review } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiButton } from "@/components/ai-button";
import { CopyButton, OutputBlock } from "@/components/copy-button";

interface Audit {
  score: number;
  summary: string;
  items: { area: string; status: "ok" | "warning" | "missing" | "unknown"; finding: string; action: string; priority: "high" | "medium" | "low" }[];
  suggested_description: string;
  keywords: string[];
}

const STATUS_VARIANT = { ok: "success", warning: "warning", missing: "danger", unknown: "outline" } as const;
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function AuditCard() {
  const { business, t, fail } = useApp();
  const [profile, setProfile] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<Audit | null>(null);
  if (!business) return null;

  async function run() {
    setLoading(true);
    try {
      const res = await runAi<Audit>("gbp_audit", business!, { profile, details });
      res.items = [...(res.items ?? [])].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));
      setAudit(res);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  const checklistText = () =>
    audit
      ? [audit.summary, "", ...audit.items.map((i) => `[${t(`seo.status.${i.status}`)}] ${i.area}: ${i.finding}\n→ ${i.action}`)].join("\n")
      : "";

  return (
    <Card>
      <CardHeader title={t("seo.audit")} />
      <CardContent className="space-y-3">
        <Field label={t("seo.profile")}>
          <Input value={profile} onChange={(e) => setProfile(e.target.value)} placeholder="https://maps.app.goo.gl/… / Business name, City" />
        </Field>
        <Field label={t("seo.details")} hint={t("seo.details.hint")}>
          <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} />
        </Field>
        <AiButton onClick={run} loading={loading} loadingText={t("common.generating")} disabled={!profile.trim()}>
          {t("seo.auditBtn")}
        </AiButton>

        {audit && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className={cn("text-3xl font-semibold tabular-nums", audit.score >= 75 ? "text-emerald-400" : audit.score >= 50 ? "text-amber-400" : "text-red-400")}>
                {audit.score}
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">{audit.summary}</p>
              <CopyButton text={checklistText} label={t("common.copyAll")} />
            </div>
            <div className="divide-y rounded-md border">
              {audit.items.map((i, idx) => (
                <div key={idx} className="flex gap-3 px-3 py-2.5 text-sm">
                  <Badge variant={STATUS_VARIANT[i.status] ?? "outline"} className="mt-0.5 h-fit w-16 justify-center">
                    {t(`seo.status.${i.status}`)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {i.area} {i.priority === "high" && <span className="text-xs text-red-400">●</span>}
                    </div>
                    <div className="text-muted-foreground">{i.finding}</div>
                    <div className="mt-0.5">→ {i.action}</div>
                  </div>
                </div>
              ))}
            </div>
            {audit.suggested_description && <OutputBlock title={t("seo.suggestedDesc")} text={audit.suggested_description} />}
            {audit.keywords?.length > 0 && <OutputBlock title={t("seo.keywords")} text={audit.keywords.join(", ")} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PostsCard() {
  const { business, t, fail } = useApp();
  const posts = useCollection("gbp_posts");
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  if (!business) return null;

  async function run() {
    setLoading(true);
    try {
      const res = await runAi<{ posts: { week: number; title: string; body: string; cta: string; image_idea: string }[] }>("gbp_posts", business!, { focus });
      const today = todayInTz(business!.timezone);
      await posts.insert(
        (res.posts ?? []).slice(0, 4).map((p, i) => ({
          title: p.title,
          body: p.body,
          cta: p.cta,
          image_idea: p.image_idea,
          status: "draft" as const,
          scheduled_for: addDaysYmd(today, 7 * i),
        })),
      );
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader title={t("seo.posts")} />
      <CardContent className="space-y-3">
        <Field label={`${t("seo.postsFocus")} (${t("common.optional")})`}>
          <Input value={focus} onChange={(e) => setFocus(e.target.value)} />
        </Field>
        <AiButton onClick={run} loading={loading} loadingText={t("common.generating")}>
          {t("seo.postsBtn")}
        </AiButton>
        <div className="space-y-2">
          {posts.rows.map((p) => (
            <OutputBlock
              key={p.id}
              title={
                <span className="flex items-center gap-2">
                  {p.scheduled_for && <span>{formatDay(business, p.scheduled_for)}</span>}
                  <span className="text-foreground">{p.title}</span>
                  <Badge variant={p.status === "published" ? "success" : "outline"}>{p.status === "published" ? t("seo.published") : t("seo.draft")}</Badge>
                </span>
              }
              text={`${p.title}\n\n${p.body}${p.cta ? `\n\nCTA: ${p.cta}` : ""}`}
              actions={
                <>
                  {p.status !== "published" && (
                    <Button size="xs" variant="ghost" onClick={() => posts.update(p.id, { status: "published" })} title={t("seo.markPublished")}>
                      <Check />
                    </Button>
                  )}
                  <Button size="xs" variant="ghost" onClick={() => confirm(t("common.confirmDelete")) && posts.remove(p.id)}>
                    <Trash2 />
                  </Button>
                </>
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5" aria-label={`${n}`}>
          <Star className={cn("size-5", n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
        </button>
      ))}
    </div>
  );
}

function ReviewsCard() {
  const { business, t, fail, uiLang } = useApp();
  const reviews = useCollection("reviews");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<Review | null>(null);
  if (!business) return null;

  async function run() {
    setLoading(true);
    try {
      const res = await runAi<{ detected_language: string; replies: string[] }>("review_reply", business!, { content, author, rating });
      const [created] = await reviews.insert([
        { author, rating, content, detected_language: res.detected_language ?? "", replies: res.replies ?? [], chosen_reply: "", status: "pending" },
      ]);
      if (created) setCurrent(created);
      setContent("");
      setAuthor("");
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  const shown = current ? reviews.rows.find((r) => r.id === current.id) ?? current : null;

  return (
    <Card id="reviews">
      <CardHeader title={t("seo.reviews")} />
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label={`${t("seo.reviewAuthor")} (${t("common.optional")})`}>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </Field>
          <Field label={t("seo.stars")}>
            <Stars value={rating} onChange={setRating} />
          </Field>
        </div>
        <Field label={t("seo.reviewText")}>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
        </Field>
        <AiButton onClick={run} loading={loading} loadingText={t("common.generating")} disabled={!content.trim()}>
          {t("seo.reviewBtn")}
        </AiButton>

        {shown && <ReviewReplies review={shown} onUse={(reply) => reviews.update(shown.id, { chosen_reply: reply, status: "replied" })} />}

        {reviews.rows.length > 0 && (
          <div className="pt-2">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">{t("common.history")}</div>
            <div className="divide-y rounded-md border">
              {reviews.rows.map((r) => (
                <div key={r.id} className={cn("flex items-center gap-2 px-3 py-2 text-sm", shown?.id === r.id && "bg-accent/50")}>
                  <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setCurrent(r)}>
                    <span className="shrink-0 text-amber-400">{"★".repeat(r.rating)}</span>
                    <span className="truncate">{r.content}</span>
                  </button>
                  {r.detected_language && <Badge variant="outline" title={languageName(r.detected_language, uiLang)}>{r.detected_language}</Badge>}
                  <button onClick={() => reviews.update(r.id, { status: r.status === "pending" ? "replied" : "pending" })}>
                    <Badge variant={r.status === "replied" ? "success" : "warning"}>{r.status === "replied" ? t("seo.replied") : t("seo.pending")}</Badge>
                  </button>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{formatDateTime(business, r.created_at, { dateStyle: "short" })}</span>
                  <Button size="xs" variant="ghost" onClick={() => confirm(t("common.confirmDelete")) && reviews.remove(r.id)}>
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

function ReviewReplies({ review, onUse }: { review: Review; onUse: (reply: string) => void }) {
  const { t, uiLang } = useApp();
  return (
    <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="text-amber-400">{"★".repeat(review.rating)}</span>
        {review.detected_language && (
          <span>
            {t("seo.detected")}: <span className="text-foreground">{languageName(review.detected_language, uiLang)}</span>
          </span>
        )}
      </div>
      <p className="line-clamp-3 text-sm italic text-muted-foreground">“{review.content}”</p>
      {review.replies.map((r, i) => (
        <OutputBlock
          key={i}
          title={`#${i + 1}`}
          text={r}
          className={review.chosen_reply === r ? "border-emerald-500/50" : ""}
          actions={
            <Button
              size="xs"
              variant={review.chosen_reply === r ? "secondary" : "ghost"}
              onClick={() => {
                onUse(r);
                toast.success(t("seo.replied"));
              }}
            >
              <Check /> {t("seo.useReply")}
            </Button>
          }
        />
      ))}
    </div>
  );
}

export default function SeoPage() {
  const { t } = useApp();
  return (
    <>
      <PageHeader title={t("seo.title")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <AuditCard />
          <PostsCard />
        </div>
        <ReviewsCard />
      </div>
    </>
  );
}
