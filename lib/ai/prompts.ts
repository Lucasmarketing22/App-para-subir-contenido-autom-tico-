import { formatInTimeZone } from "date-fns-tz";
import type { Business, Campaign } from "../types";
import { businessLocale, currencySymbol, formatMoney, languageName, countryName } from "../locale";

export const AI_TASKS = [
  "gbp_audit",
  "gbp_posts",
  "review_reply",
  "sales_reply",
  "follow_up",
  "ads_extract",
  "ads_report",
  "ad_copies",
  "social_calendar",
  "video_script",
] as const;
export type AiTask = (typeof AI_TASKS)[number];

const TONES: Record<Business["brand_tone"], string> = {
  formal: "Formal, polite and professional. No slang, no emojis.",
  casual: "Warm, friendly and close, like a helpful person from the team. Emojis only sparingly.",
  fun: "Playful, energetic and witty. Emojis welcome when natural.",
  premium: "Elegant, refined and exclusive. Understated confidence, no hype, no emojis.",
};

export function businessContext(b: Business): string {
  const lang = languageName(b.language, "en");
  const now = new Date();
  return [
    `BUSINESS PROFILE`,
    `- Name: ${b.name}`,
    `- Type: ${b.type}`,
    `- Country: ${b.country_code ? `${countryName(b.country_code, "en")} (${b.country_code})` : "not specified"}`,
    `- Client language: ${lang} (ISO ${b.language}) — locale ${businessLocale(b)}`,
    `- Currency: ${b.currency} (symbol "${currencySymbol(b.currency)}"). Correct local format example: ${formatMoney(b, 1234.5)}`,
    `- Time zone: ${b.timezone}. Current local date/time there: ${formatInTimeZone(now, b.timezone, "EEEE yyyy-MM-dd HH:mm")}`,
    `- Brand tone: ${b.brand_tone} — ${TONES[b.brand_tone]}`,
    `- Knowledge base (services, prices, hours, policies — the ONLY source of facts about the business):`,
    b.knowledge?.trim() ? b.knowledge.trim() : "(empty — do not invent facts; use [PLACEHOLDERS] in square brackets for any missing detail)",
  ].join("\n");
}

function system(b: Business, extra = ""): string {
  const lang = languageName(b.language, "en");
  return `You are a senior local-marketing operator (social media, local SEO, paid media and sales) working for an agency.
${businessContext(b)}

GLOBAL RULES
- Write ALL client-facing text in ${lang} (${b.language}) with natural, native phrasing for ${b.country_code ? countryName(b.country_code, "en") : "that market"}, unless a rule below says otherwise.
- Money is always in ${b.currency}, formatted like ${formatMoney(b, 1234.5)}. Never convert to another currency.
- Times and dates are always in ${b.timezone} local time, formatted the way people in that locale write them.
- Respect the brand tone strictly.
- Never invent prices, availability, addresses or policies that are not in the knowledge base. Use [PLACEHOLDER] in square brackets instead, written in ${lang}.
- Output is pasted directly into real channels: no markdown (#, **, tables). Plain text, line breaks allowed.
- Respond ONLY with valid JSON matching the requested schema.
${extra}`;
}

type Input = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : JSON.stringify(v));

export function buildPrompt(task: AiTask, b: Business, input: Input): { system: string; user: string; temperature: number } {
  switch (task) {
    case "gbp_audit":
      return {
        temperature: 0.4,
        system: system(b),
        user: `Audit this Google Business Profile for local SEO.
Profile URL or name: ${s(input.profile)}
Data pasted from the profile (may be empty): ${s(input.details) || "(none)"}

You cannot browse the web. Base the audit on the pasted data and on best practices for a "${b.type}" business. When data is missing for an item, mark it "unknown" and tell exactly what to check.
Always cover: photos (count, recency, types missing), posts (frequency/recency), reviews (unanswered, rating, velocity), description (keywords for ${b.type} + city), categories, services/products, hours & special hours, attributes, Q&A, NAP consistency, website/booking links.

JSON schema:
{"score": number 0-100, "summary": string, "items": [{"area": string, "status": "ok"|"warning"|"missing"|"unknown", "finding": string, "action": string, "priority": "high"|"medium"|"low"}], "suggested_description": string (max 750 chars, with local keywords), "keywords": string[]}`,
      };

    case "gbp_posts":
      return {
        temperature: 0.8,
        system: system(b),
        user: `Create 4 Google Business Profile posts for this month (one per week) for a ${b.type}.
Focus / offers this month: ${s(input.focus) || "(none — use evergreen angles relevant to the business type and season in its country)"}
Each post: 150-300 words max 1500 chars, local keywords, a clear CTA button type (Book, Order online, Buy, Learn more, Sign up, Call now).
JSON schema: {"posts": [{"week": 1-4, "title": string, "body": string, "cta": string (button type in English, e.g. "Book"), "image_idea": string}]}`,
      };

    case "review_reply": {
      const rating = Number(input.rating) || 5;
      const mode =
        rating <= 2
          ? "NEGATIVE review: empathetic, apologize sincerely without excuses, acknowledge the specific issue, offer a concrete solution and a private contact channel ([CONTACT] placeholder if not in knowledge base). Never argue."
          : rating === 3
            ? "MIXED review: thank them, acknowledge what could be better, mention a concrete improvement, invite them back."
            : "POSITIVE review: genuine gratitude, mention a specific detail they liked, invite them back. Short.";
      return {
        temperature: 0.8,
        system: system(
          b,
          `- LANGUAGE OVERRIDE FOR THIS TASK: detect the language of the review and write the replies in THAT SAME language (even if it differs from ${b.language}). Keep the brand tone.`,
        ),
        user: `Review (${rating}/5 stars) by "${s(input.author) || "customer"}":
"""${s(input.content)}"""

${mode}
Write 3 different reply options (different lengths/angles), signed as the ${b.name} team. Use the reviewer's first name if present. 40-120 words each.
JSON schema: {"detected_language": ISO 639-1 code uppercase, "sentiment": "positive"|"mixed"|"negative", "replies": [string, string, string]}`,
      };
    }

    case "sales_reply":
      return {
        temperature: 0.6,
        system: system(
          b,
          `- LANGUAGE: reply in ${languageName(b.language, "en")} unless the lead clearly wrote in another language — then reply in the lead's language.`,
        ),
        user: `A lead sent this message (WhatsApp / Instagram DM / email):
"""${s(input.message)}"""
Extra context from me: ${s(input.context) || "(none)"}

Write the reply that maximizes the chance of closing the sale/booking NOW:
- Answer the exact question first (dates → interpret them relative to today's local date in ${b.timezone}; price → only from knowledge base, in ${b.currency}).
- Add 1-2 value points, light urgency only if truthful, and a strong, specific CTA (book link, deposit, call, reply with X).
- Chat-friendly length.
JSON schema: {"reply": string, "alt_short": string (shorter WhatsApp version), "missing_info": string[] (in ${languageName(b.language, "en")}: facts I should add to the knowledge base to answer better)}`,
      };

    case "follow_up":
      return {
        temperature: 0.8,
        system: system(b),
        user: `Write a persuasive follow-up message for a lead who has not converted.
Situation: ${s(input.context)}
Original conversation (may be empty): ${s(input.history) || "(none)"}
Rules: not pushy, personal, remind the value, remove friction (answer likely objection), clear CTA, give a reason to act now only if truthful.
JSON schema: {"options": [{"label": string (in client language, e.g. soft / direct / last chance), "message": string}] (exactly 3)}`,
      };

    case "ads_extract":
      return {
        temperature: 0,
        system: `You extract advertising performance data into JSON. Numbers only, no currency symbols. Understand any language, CSV, TSV, copied tables, or loose notes like "Campaign A - Spend 120 - Leads 3". Decimal separators may be "," or "." depending on locale — infer correctly. Respond ONLY with JSON.`,
        user: `Data:
"""${s(input.raw)}"""
Currency of the account: ${b.currency}.
JSON schema: {"period": string (date range if present, else ""), "campaigns": [{"name": string, "platform": "Meta"|"Google"|"TikTok"|"Other", "spend": number, "conversions": number (leads/purchases/bookings/results; 0 if none), "conversion_label": string (e.g. "leads"), "clicks": number|null, "impressions": number|null, "revenue": number|null}]}`,
      };

    case "ads_report": {
      const campaigns = (input.campaigns as Campaign[]) ?? [];
      return {
        temperature: 0.5,
        system: system(b),
        user: `Write a professional performance report for the client, ready to send by email/WhatsApp.
Period: ${s(input.period) || "(not specified)"}
Campaigns (spend in ${b.currency}; "flag":"pause" was computed by our rule: spend > ${formatMoney(b, b.ad_pause_threshold)} with 0 conversions — you MUST recommend pausing those):
${JSON.stringify(campaigns)}
My notes: ${s(input.notes) || "(none)"}

Structure: greeting, executive summary (3 lines), key numbers (total spend, results, cost per result per campaign), what worked, what didn't, next steps. Clear, non-technical language for a business owner. Compute cost per result yourself; format money like ${formatMoney(b, 1234.5)}.
JSON schema: {"report": string, "recommendations": [{"campaign": string, "action": "pause"|"scale"|"optimize"|"keep", "reason": string}]}`,
      };
    }

    case "ad_copies":
      return {
        temperature: 0.9,
        system: system(b),
        user: `Offer: ${s(input.offer)}
Platform: ${s(input.platform) || "Meta Ads (Facebook/Instagram)"}
Audience: ${s(input.audience) || "(infer the best local audience for a " + b.type + ")"}
Write 5 ad copies with different angles (pain, desire, social proof, urgency, curiosity). If a price is given, show it in ${b.currency} formatted like ${formatMoney(b, 99)}.
JSON schema: {"copies": [{"angle": string, "hook": string, "benefit": string, "cta": string, "headline": string (max 40 chars), "full_text": string (hook + benefit + CTA, ready to paste)}]}`,
      };

    case "social_calendar":
      return {
        temperature: 0.9,
        system: system(b),
        user: `Create a monthly content calendar of 12 post ideas (3 per week) for Instagram/TikTok/Facebook for this ${s(input.business_type) || b.type}.
Month: ${s(input.month)} (local dates in ${b.timezone}). Consider local holidays and seasonality of ${b.country_code ? countryName(b.country_code, "en") : "the market"} for that month.
Goals / notes: ${s(input.goals) || "(grow local awareness and bookings)"}
Mix types: around 6 reels, 4 carousels, 2 stories.
JSON schema: {"ideas": [{"type": "reel"|"carousel"|"story", "day": number (day of month), "title": string, "copy": string (full caption with CTA), "hashtags": string[] (8-15, mix local + niche, without spaces)}]}`,
      };

    case "video_script":
      return {
        temperature: 0.8,
        system: system(
          b,
          `- EXCEPTION: "video_prompt" and "negative_prompt" must be in ENGLISH (AI video tools work best in English). Everything else in the client language.`,
        ),
        user: `Create a 20-second vertical Reel (9:16) from this description of photos / place / services:
"""${s(input.description)}"""
Goal: ${s(input.goal) || "bookings / visits"}

Scenes must cover exactly 0-20s: Hook 0-3s, then development, CTA at the end. Fast cuts, on-screen text short.
The video_prompt must be one paste-ready prompt for Runway / Pika / Luma (cinematic description: subject, setting, camera movement, lighting, mood, style, 9:16), and capcut_steps are editing instructions for CapCut.
JSON schema: {"title": string, "scenes": [{"start": number, "end": number, "label": string (e.g. Hook), "visual": string, "voiceover": string, "on_screen_text": string}], "music": string, "post_copy": string, "hashtags": string[], "video_prompt": string, "negative_prompt": string, "capcut_steps": string[]}`,
      };
  }
}
