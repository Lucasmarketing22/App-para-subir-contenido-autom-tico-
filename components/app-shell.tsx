"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, Clapperboard, Database, HardDrive, LayoutDashboard, LogOut, Menu, MapPin, Settings, Users, X, Loader2, Building2 } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { getSupabase, hasSupabase } from "@/lib/data/store";
import { formatDateTime, currencySymbol } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { Combobox } from "./ui/combobox";
import { NewBusinessDialog } from "./business-form";
import { AuthScreen } from "./auth-screen";
import { Button } from "./ui/button";
import type { I18nKey } from "@/lib/i18n";

const NAV: { href: string; key: I18nKey; icon: typeof LayoutDashboard }[] = [
  { href: "/", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/seo", key: "nav.seo", icon: MapPin },
  { href: "/crm", key: "nav.crm", icon: Users },
  { href: "/ads", key: "nav.ads", icon: BarChart3 },
  { href: "/social", key: "nav.social", icon: Clapperboard },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

function ClientClock() {
  const { business, t } = useApp();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!business) return null;
  return (
    <div className="text-[11px] text-muted-foreground">
      <div>{t("common.clientLocalTime")}</div>
      <div className="text-foreground">{formatDateTime(business, new Date(), { weekday: "short", hour: "2-digit", minute: "2-digit" })}</div>
      <div className="truncate">
        {business.timezone} · {business.language} · {business.currency} {currencySymbol(business.currency)}
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t, businesses, business, setActive, session } = useApp();
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className="flex items-center gap-2 px-1 pt-1">
        <div className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">OS</div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">My Work OS</div>
          <div className="text-[11px] text-muted-foreground">Global AI Automation</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("nav.activeClient")}</div>
        {businesses.length > 0 ? (
          <Combobox
            value={business?.id ?? ""}
            onChange={(id) => id && setActive(id)}
            options={businesses.map((b) => ({ value: b.id, label: b.name, hint: `${b.language} · ${b.currency}`, keywords: [b.type, b.timezone] }))}
            searchPlaceholder={t("common.search")}
            emptyText={t("common.noResults")}
          />
        ) : (
          <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">{t("nav.noClients")}</div>
        )}
        <NewBusinessDialog />
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, key, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-accent text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t(key)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t pt-3">
        <ClientClock />
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {hasSupabase ? <Database className="size-3.5" /> : <HardDrive className="size-3.5" />}
            {hasSupabase ? t("nav.storage.supabase") : t("nav.storage.local")}
          </span>
          {session && (
            <button className="flex items-center gap-1 hover:text-foreground" onClick={() => getSupabase()?.auth.signOut()} title={t("nav.signOut")}>
              <LogOut className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useApp();
  return (
    <div className="mx-auto mt-20 max-w-md rounded-lg border bg-card p-8 text-center">
      <Building2 className="mx-auto size-8 text-muted-foreground" />
      <h2 className="mt-3 text-base font-semibold">{t("empty.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("empty.body")}</p>
      <div className="mx-auto mt-5 max-w-[220px]">
        <NewBusinessDialog />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, needsAuth, business } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  if (!ready)
    return (
      <div className="grid h-screen place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  if (needsAuth) return <AuthScreen />;

  const content = business || pathname === "/settings" ? children : <EmptyState />;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-card/40 md:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r bg-card">
            <Button size="icon" variant="ghost" className="absolute right-2 top-2" onClick={() => setMobileOpen(false)}>
              <X />
            </Button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b bg-background/95 px-3 md:hidden">
          <Button size="icon" variant="ghost" onClick={() => setMobileOpen(true)}>
            <Menu />
          </Button>
          <span className="truncate text-sm font-medium">{business?.name ?? "My Work OS"}</span>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:px-8 md:py-8">{content}</main>
      </div>
    </div>
  );
}
