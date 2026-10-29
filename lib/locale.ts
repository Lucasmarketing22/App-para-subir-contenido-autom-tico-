import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { Business } from "./types";

/** ISO 639-1 codes. Display names come from Intl.DisplayNames, so nothing is tied to one UI language. */
export const LANGUAGE_CODES = [
  "af","am","ar","az","be","bg","bn","bs","ca","cs","cy","da","de","el","en","es","et","eu","fa","fi",
  "fil","fr","ga","gl","gu","he","hi","hr","hu","hy","id","is","it","ja","ka","kk","km","kn","ko","ky",
  "lo","lt","lv","mk","ml","mn","mr","ms","mt","my","nb","ne","nl","pa","pl","ps","pt","ro","ru","si",
  "sk","sl","sq","sr","sv","sw","ta","te","th","tr","uk","ur","uz","vi","zh","zu",
];

/** ISO 3166-1 alpha-2 */
export const COUNTRY_CODES = (
  "AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ " +
  "DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP " +
  "KE KG KH KM KN KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ " +
  "OM PA PE PG PH PK PL PR PS PT PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS SV SY SZ TD TG TH TJ TL TM TN TO TR TT TW TZ " +
  "UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW"
).split(" ");

const FALLBACK_CURRENCIES = "AED ARS AUD BOB BRL CAD CHF CLP CNY COP CRC CZK DKK DOP EGP EUR GBP GTQ HKD HNL HUF IDR ILS INR JPY KES KRW MAD MXN MYR NGN NIO NOK NZD PAB PEN PHP PKR PLN PYG QAR RON RSD RUB SAR SEK SGD THB TRY TWD UAH USD UYU VES VND ZAR".split(" ");

type IntlWithSupported = typeof Intl & { supportedValuesOf?: (k: string) => string[] };

export function allCurrencies(): string[] {
  try {
    const list = (Intl as IntlWithSupported).supportedValuesOf?.("currency");
    if (list?.length) return list;
  } catch {}
  return FALLBACK_CURRENCIES;
}

export function allTimeZones(): string[] {
  try {
    const list = (Intl as IntlWithSupported).supportedValuesOf?.("timeZone");
    if (list?.length) return list.includes("UTC") ? list : ["UTC", ...list];
  } catch {}
  return ["UTC"];
}

function displayName(type: "language" | "currency" | "region", code: string, uiLocale: string): string {
  try {
    return new Intl.DisplayNames([uiLocale], { type }).of(code) ?? code;
  } catch {
    return code;
  }
}

export const languageName = (code: string, uiLocale = "en") => displayName("language", code.toLowerCase(), uiLocale);
export const currencyName = (code: string, uiLocale = "en") => displayName("currency", code, uiLocale);
export const countryName = (code: string, uiLocale = "en") => displayName("region", code, uiLocale);

export function currencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

export function timeZoneOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** BCP 47 locale derived from the business: language + optional country (es-AR, pt-BR, en-GB...) */
export function businessLocale(b: Pick<Business, "language" | "country_code">): string {
  const lang = (b.language || "en").toLowerCase();
  const tag = b.country_code ? `${lang}-${b.country_code.toUpperCase()}` : lang;
  try {
    return Intl.getCanonicalLocales(tag)[0];
  } catch {
    return lang;
  }
}

export function formatMoney(b: Business, amount: number, opts: Intl.NumberFormatOptions = {}): string {
  try {
    return new Intl.NumberFormat(businessLocale(b), { style: "currency", currency: b.currency, ...opts }).format(amount || 0);
  } catch {
    return `${amount} ${b.currency}`;
  }
}

export function formatNumber(b: Business, n: number): string {
  return new Intl.NumberFormat(businessLocale(b)).format(n || 0);
}

export function formatDateTime(b: Business, iso: string | Date, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }): string {
  try {
    return new Intl.DateTimeFormat(businessLocale(b), { timeZone: b.timezone, ...opts }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

/** Formats a calendar date (YYYY-MM-DD, already in business time) without timezone shifting. */
export function formatDay(b: Business, ymd: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat(businessLocale(b), { timeZone: "UTC", ...opts }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Current date (YYYY-MM-DD) in the business time zone */
export function todayInTz(tz: string): string {
  return formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
}

/** Value for <input type="datetime-local"> showing a UTC ISO time in the business time zone */
export function toLocalInput(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "yyyy-MM-dd'T'HH:mm");
}

/** Interprets a datetime-local value as wall-clock time in the business time zone and returns UTC ISO */
export function fromLocalInput(value: string, tz: string): string {
  return fromZonedTime(value, tz).toISOString();
}

/** First day of the week for the business locale (1 = Monday ... 7 = Sunday) */
function firstDayOfWeek(locale: string): number {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    return loc.getWeekInfo?.().firstDay ?? loc.weekInfo?.firstDay ?? 1;
  } catch {
    return 1;
  }
}

/** UTC instant at which the current week starts, in the business time zone and locale */
export function startOfWeekInTz(b: Business): Date {
  const tz = b.timezone;
  const today = todayInTz(tz);
  const isoDow = Number(formatInTimeZone(new Date(), tz, "i")); // 1..7, Monday = 1
  const first = firstDayOfWeek(businessLocale(b));
  const diff = (isoDow - first + 7) % 7;
  const [y, m, d] = today.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d - diff));
  return fromZonedTime(`${start.toISOString().slice(0, 10)}T00:00:00`, tz);
}

/** Adds days to a YYYY-MM-DD string */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function guessTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
