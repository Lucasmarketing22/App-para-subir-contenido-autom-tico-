import { NextResponse } from "next/server";
import { AI_TASKS, buildPrompt, type AiTask } from "@/lib/ai/prompts";
import type { Business } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { task?: string; business?: Business; input?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { task, business, input = {} } = body;

  if (!task || !AI_TASKS.includes(task as AiTask)) return NextResponse.json({ error: "Unknown task" }, { status: 400 });
  if (!business?.language || !business.currency || !business.timezone)
    return NextResponse.json({ error: "Business language, currency and timezone are required" }, { status: 400 });

  // Key from the browser (Settings) takes precedence; falls back to server env.
  const apiKey = req.headers.get("x-openai-key")?.trim() || process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "NO_API_KEY" }, { status: 401 });

  const prompt = buildPrompt(task as AiTask, business, input);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: prompt.temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    let message = `OpenAI error ${res.status}`;
    try {
      message = JSON.parse(detail).error?.message || message;
    } catch {}
    return NextResponse.json({ error: message }, { status: res.status === 401 ? 401 : 502 });
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "{}";
  try {
    return NextResponse.json({ result: JSON.parse(content) });
  } catch {
    return NextResponse.json({ error: "The AI returned invalid JSON. Try again." }, { status: 502 });
  }
}
