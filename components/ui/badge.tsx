import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap", {
  variants: {
    variant: {
      default: "bg-secondary text-secondary-foreground",
      primary: "bg-primary/15 text-primary",
      success: "bg-emerald-500/15 text-emerald-400",
      warning: "bg-amber-500/15 text-amber-400",
      danger: "bg-red-500/15 text-red-400",
      info: "bg-sky-500/15 text-sky-400",
      outline: "border border-border text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
