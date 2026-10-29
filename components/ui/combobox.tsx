"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboOption {
  value: string;
  label: string;
  /** Right-aligned hint (symbol, offset, code) */
  hint?: string;
  /** Extra text matched by search */
  keywords?: string[];
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  allowClear?: boolean;
}

/** Searchable select (shadcn Combobox pattern) */
export function Combobox({ value, onChange, options, placeholder, searchPlaceholder, emptyText, className, allowClear }: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background/60 px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected ? selected.label : placeholder}</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {selected?.hint && <span className="text-xs">{selected.hint}</span>}
            <ChevronsUpDown className="size-4" />
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-[260px] rounded-md border bg-popover shadow-xl"
        >
          <Command
            filter={(itemValue, search, keywords) => {
              const hay = [itemValue, ...(keywords ?? [])].join(" ").toLowerCase();
              return search
                .toLowerCase()
                .split(/\s+/)
                .every((w) => hay.includes(w))
                ? 1
                : 0;
            }}
          >
            <Command.Input
              autoFocus
              placeholder={searchPlaceholder}
              className="h-9 w-full border-b bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Command.List className="scrollbar-thin max-h-64 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-xs text-muted-foreground">{emptyText}</Command.Empty>
              {allowClear && (
                <Command.Item
                  value="__none"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm text-muted-foreground data-[selected=true]:bg-accent"
                >
                  —
                </Command.Item>
              )}
              {options.map((o) => (
                <Command.Item
                  key={o.value}
                  value={`${o.label} ${o.value}`}
                  keywords={o.keywords}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm data-[selected=true]:bg-accent"
                >
                  <Check className={cn("size-3.5 shrink-0", o.value === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                  {o.hint && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{o.hint}</span>}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
