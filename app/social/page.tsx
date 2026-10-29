"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Plus, Trash2 } from "lucide-react";
import { useApp, useCollection } from "@/lib/app-context";
import { runAi } from "@/lib/ai/client";
import { addDaysYmd, formatDay, todayInTz } from "@/lib/locale";
import { SOCIAL_STATUSES, SOCIAL_TYPES, type SocialPost, type SocialStatus, type SocialType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AiButton } from "@/components/ai-button";
import { CopyButton, OutputBlock } from "@/components/copy-button";

type PostForm = Omit<SocialPost, "id" | "created_at" | "business_id">;
const TYPE_VARIANT = { reel: "primary", carousel: "info", story: "warning", post: "default" } as const;

const postText = (p: Pick<SocialPost, "copy" | "hashtags">) => `${p.copy}${p.hashtags.length ? `\n\n${p.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}` : ""}`;

function PostDialog({ initial, onSave, onClose }: { initial: PostForm; onSave: (p: PostForm) => void; onClose: () => void }) {
  const { business, t } = useApp();
  const [form, setForm] = useState(initial);
  const [tags, setTags] = useState(initial.hashtags.join(" "));
  if (!business) return null;
  const set = <K extends keyof PostForm>(k: K, v: PostForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={initial.title || t("social.addIdea")} className="max-w-xl">
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ ...form, hashtags: tags.split(/[\s,]+/).filter(Boolean) });
            onClose();
          }}
        >
          <Field label="Title" className="sm:col-span-3">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} required autoFocus />
          </Field>
          <Field label="Type">
            <NativeSelect value={form.type} onChange={(e) => set("type", e.target.value as SocialType)}>
              {SOCIAL_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`social.type.${ty}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("crm.status")}>
            <NativeSelect value={form.status} onChange={(e) => set("status", e.target.value as SocialStatus)}>
              {SOCIAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`social.status.${s}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={`${t("crm.date")} (${business.timezone})`}>
            <Input type="date" value={form.scheduled_for ?? ""} onChange={(e) => set("scheduled_for", e.target.value || null)} />
          </Field>
          <Field label="Copy" className="sm:col-span-3">
            <Textarea value={form.copy} onChange={(e) => set("copy", e.target.value)} rows={7} />
          </Field>
          <Field label="Hashtags" className="sm:col-span-3">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
          <div className="flex justify-between gap-2 sm:col-span-3">
            <CopyButton text={() => postText({ copy: form.copy, hashtags: tags.split(/[\s,]+/).filter(Boolean) })} size="sm" />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Board({ posts }: { posts: ReturnType<typeof useCollection<"social_posts">> }) {
  const { business, t } = useApp();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<SocialStatus | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; form: PostForm } | null>(null);
  if (!business) return null;

  const sorted = [...posts.rows].sort((a, b) => (a.scheduled_for ?? "9999").localeCompare(b.scheduled_for ?? "9999"));
  const blank: PostForm = { type: "reel", title: "", copy: "", hashtags: [], status: "todo", scheduled_for: todayInTz(business.timezone) };

  return (
    <Card>
      <CardHeader
        title={t("social.board")}
        description={t("social.dragHint")}
        actions={
          <Button size="sm" variant="secondary" onClick={() => setEditing({ id: null, form: blank })}>
            <Plus /> {t("social.addIdea")}
          </Button>
        }
      />
      <div className="grid gap-3 p-3 md:grid-cols-3">
        {SOCIAL_STATUSES.map((status) => {
          const items = sorted.filter((p) => p.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={() => {
                if (dragId) posts.update(dragId, { status });
                setDragId(null);
                setOver(null);
              }}
              className={cn("min-h-[160px] rounded-md border bg-background/40 p-2", over === status && "border-primary/60 bg-primary/5")}
            >
              <div className="mb-2 flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
                {t(`social.status.${status}`)}
                <span>{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn("cursor-grab rounded-md border bg-card p-2.5 text-sm active:cursor-grabbing", dragId === p.id && "opacity-50")}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <Badge variant={TYPE_VARIANT[p.type]}>{t(`social.type.${p.type}`)}</Badge>
                      {p.scheduled_for && <span className="text-[11px] text-muted-foreground">{formatDay(business, p.scheduled_for)}</span>}
                    </div>
                    <button
                      className="block w-full text-left"
                      onClick={() =>
                        setEditing({
                          id: p.id,
                          form: { type: p.type, title: p.title, copy: p.copy, hashtags: p.hashtags, status: p.status, scheduled_for: p.scheduled_for },
                        })
                      }
                    >
                      <div className="font-medium leading-snug">{p.title}</div>
                      <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{p.copy}</p>
                    </button>
                    <div className="mt-2 flex items-center gap-1">
                      <NativeSelect value={p.status} onChange={(e) => posts.update(p.id, { status: e.target.value as SocialStatus })} className="flex-1 md:hidden" aria-label={t("social.move")}>
                        {SOCIAL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(`social.status.${s}`)}
                          </option>
                        ))}
                      </NativeSelect>
                      <div className="ml-auto flex gap-1">
                        <CopyButton text={postText(p)} />
                        <Button size="xs" variant="ghost" onClick={() => confirm(t("common.confirmDelete")) && posts.remove(p.id)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {editing && (
        <PostDialog
          key={editing.id ?? "new"}
          initial={editing.form}
          onClose={() => setEditing(null)}
          onSave={(form) => (editing.id ? posts.update(editing.id, form) : posts.insert([form]))}
        />
      )}
    </Card>
  );
}

function CalendarGenerator({ posts }: { posts: ReturnType<typeof useCollection<"social_posts">> }) {
  const { business, t, fail } = useApp();
  // From the 20th on, plan next month by default
  const [month, setMonth] = useState(() => {
    if (!business) return "";
    const today = todayInTz(business.timezone);
    return Number(today.slice(8, 10)) >= 20 ? addDaysYmd(`${today.slice(0, 7)}-01`, 32).slice(0, 7) : today.slice(0, 7);
  });
  const [type, setType] = useState(() => (business ? t(`client.type.${business.type}`) : ""));
  const [goals, setGoals] = useState("");
  const [loading, setLoading] = useState(false);
  if (!business) return null;

  async function run() {
    setLoading(true);
    try {
      const res = await runAi<{ ideas: { type: SocialType; day: number; title: string; copy: string; hashtags: string[] }[] }>("social_calendar", business!, {
        month,
        business_type: `${type} (${business!.type})`,
        goals,
      });
      const [y, m] = month.split("-").map(Number);
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const ideas = (res.ideas ?? []).slice(0, 12);
      await posts.insert(
        ideas.map((i, idx) => {
          const day = Math.min(Math.max(1, Number(i.day) || Math.round(((idx + 1) * daysInMonth) / (ideas.length + 1))), daysInMonth);
          return {
            type: SOCIAL_TYPES.includes(i.type) ? i.type : "post",
            title: i.title,
            copy: i.copy,
            hashtags: i.hashtags ?? [],
            status: "todo" as const,
            scheduled_for: `${month}-${String(day).padStart(2, "0")}`,
          };
        }),
      );
      toast.success(`${ideas.length} ✓`);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader title={t("social.genTitle")} />
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("social.month")}>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
          <Field label={t("social.businessType")}>
            <Input value={type} onChange={(e) => setType(e.target.value)} />
          </Field>
        </div>
        <Field label={`${t("social.goals")} (${t("common.optional")})`}>
          <Input value={goals} onChange={(e) => setGoals(e.target.value)} />
        </Field>
        <AiButton onClick={run} loading={loading} loadingText={t("common.generating")} disabled={!month}>
          {t("social.genBtn")}
        </AiButton>
      </CardContent>
    </Card>
  );
}

interface VideoScript {
  title: string;
  scenes: { start: number; end: number; label: string; visual: string; voiceover: string; on_screen_text: string }[];
  music: string;
  post_copy: string;
  hashtags: string[];
  video_prompt: string;
  negative_prompt: string;
  capcut_steps: string[];
}

function VideoStudio({ posts }: { posts: ReturnType<typeof useCollection<"social_posts">> }) {
  const { business, t, fail } = useApp();
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<VideoScript | null>(null);
  if (!business) return null;

  async function run() {
    setLoading(true);
    try {
      setRes(await runAi<VideoScript>("video_script", business!, { description, goal }));
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  const scriptText = (r: VideoScript) =>
    r.scenes
      .map((s) => `[${s.start}-${s.end}s] ${s.label}\n${t("social.voiceover")}: ${s.voiceover}\n${t("social.onScreen")}: ${s.on_screen_text}\nVisual: ${s.visual}`)
      .join("\n\n");

  const allText = (r: VideoScript) =>
    [
      `${r.title}`,
      `\n== ${t("social.script")} ==\n${scriptText(r)}`,
      r.music && `\n${t("social.music")}: ${r.music}`,
      `\n== ${t("social.postCopy")} ==\n${postText({ copy: r.post_copy, hashtags: r.hashtags ?? [] })}`,
      `\n== ${t("social.videoPrompt")} ==\n${r.video_prompt}`,
      r.negative_prompt && `\n${t("social.negPrompt")}: ${r.negative_prompt}`,
      r.capcut_steps?.length && `\n== ${t("social.capcut")} ==\n${r.capcut_steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <Card>
      <CardHeader
        title={t("social.video")}
        actions={
          res && (
            <>
              <Button
                size="xs"
                variant="ghost"
                onClick={async () => {
                  await posts.insert([
                    { type: "reel", title: res.title, copy: res.post_copy, hashtags: res.hashtags ?? [], status: "in_production", scheduled_for: todayInTz(business.timezone) },
                  ]);
                  toast.success(t("social.added"));
                }}
              >
                <CalendarPlus /> {t("social.toBoard")}
              </Button>
              <CopyButton text={() => allText(res)} label={t("common.copyAll")} />
            </>
          )
        }
      />
      <CardContent className="space-y-3">
        <Field label={t("social.videoDesc")}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("social.videoPh")} rows={4} />
        </Field>
        <Field label={`${t("social.videoGoal")} (${t("common.optional")})`}>
          <Input value={goal} onChange={(e) => setGoal(e.target.value)} />
        </Field>
        <AiButton onClick={run} loading={loading} loadingText={t("common.generating")} disabled={!description.trim()}>
          {t("social.videoBtn")}
        </AiButton>

        {res && (
          <div className="space-y-3">
            <div className="rounded-md border">
              <div className="flex items-center justify-between border-b px-3 py-1.5">
                <span className="truncate text-xs font-medium text-muted-foreground">
                  {t("social.script")} · {res.title}
                </span>
                <CopyButton text={() => scriptText(res)} />
              </div>
              <div className="divide-y">
                {res.scenes.map((s, i) => (
                  <div key={i} className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[72px_1fr]">
                    <div>
                      <Badge variant="primary" className="tabular-nums">
                        {s.start}–{s.end}s
                      </Badge>
                      <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
                    </div>
                    <div className="space-y-0.5">
                      <p>🎙 {s.voiceover}</p>
                      <p className="text-amber-300/90">▭ {s.on_screen_text}</p>
                      <p className="text-xs text-muted-foreground">🎬 {s.visual}</p>
                    </div>
                  </div>
                ))}
              </div>
              {res.music && <div className="border-t px-3 py-2 text-xs text-muted-foreground">♪ {res.music}</div>}
            </div>
            <OutputBlock title={t("social.postCopy")} text={postText({ copy: res.post_copy, hashtags: res.hashtags ?? [] })} />
            <OutputBlock title={t("social.videoPrompt")} text={res.video_prompt} />
            {res.negative_prompt && <OutputBlock title={t("social.negPrompt")} text={res.negative_prompt} />}
            {res.capcut_steps?.length > 0 && <OutputBlock title={t("social.capcut")} text={res.capcut_steps.map((s, i) => `${i + 1}. ${s}`).join("\n")} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SocialPage() {
  const { t, business } = useApp();
  const posts = useCollection("social_posts");
  return (
    <>
      <PageHeader title={t("social.title")} />
      <div className="space-y-4">
        <Board posts={posts} />
        <div className="grid gap-4 lg:grid-cols-2">
          <CalendarGenerator key={business?.id} posts={posts} />
          <VideoStudio posts={posts} />
        </div>
      </div>
    </>
  );
}
