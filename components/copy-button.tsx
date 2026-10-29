"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "./ui/button";
import { useApp } from "@/lib/app-context";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for non-secure contexts
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export function CopyButton({ text, label, size = "xs", variant = "secondary", ...props }: { text: string | (() => string); label?: string } & ButtonProps) {
  const { t } = useApp();
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={async () => {
        await copyText(typeof text === "function" ? text() : text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      {...props}
    >
      {done ? <Check className="text-emerald-400" /> : <Copy />}
      {done ? t("common.copied") : (label ?? t("common.copy"))}
    </Button>
  );
}

/** A block of generated text with a copy button */
export function OutputBlock({ title, text, className, actions }: { title?: React.ReactNode; text: string; className?: string; actions?: React.ReactNode }) {
  return (
    <div className={`rounded-md border bg-background/40 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
        <span className="truncate text-xs font-medium text-muted-foreground">{title}</span>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <CopyButton text={text} />
        </div>
      </div>
      <p className="whitespace-pre-wrap break-words px-3 py-2.5 text-sm leading-relaxed">{text}</p>
    </div>
  );
}
