"use client";

import { useMemo } from "react";
import type { ComboOption } from "./ui/combobox";
import {
  allCurrencies,
  allTimeZones,
  COUNTRY_CODES,
  countryName,
  currencyName,
  currencySymbol,
  LANGUAGE_CODES,
  languageName,
  timeZoneOffset,
} from "@/lib/locale";

/** Option lists for language / currency / time zone / country, labelled in the UI language */
export function useLocaleOptions(uiLang: string) {
  return useMemo(() => {
    const byLabel = (a: ComboOption, b: ComboOption) => a.label.localeCompare(b.label, uiLang);
    const languages: ComboOption[] = LANGUAGE_CODES.map((c) => ({
      value: c.toUpperCase(),
      label: `${languageName(c, uiLang)} — ${languageName(c, c)}`,
      hint: c.toUpperCase(),
      keywords: [languageName(c, "en")],
    })).sort(byLabel);
    const currencies: ComboOption[] = allCurrencies()
      .map((c) => ({ value: c, label: `${c} — ${currencyName(c, uiLang)}`, hint: currencySymbol(c), keywords: [currencyName(c, "en")] }))
      .sort((a, b) => a.value.localeCompare(b.value));
    const timeZones: ComboOption[] = allTimeZones().map((tz) => ({
      value: tz,
      label: tz.replace(/_/g, " "),
      hint: timeZoneOffset(tz),
      keywords: [tz],
    }));
    const countries: ComboOption[] = COUNTRY_CODES.map((c) => ({
      value: c,
      label: countryName(c, uiLang),
      hint: c,
      keywords: [countryName(c, "en")],
    })).sort(byLabel);
    return { languages, currencies, timeZones, countries };
  }, [uiLang]);
}
