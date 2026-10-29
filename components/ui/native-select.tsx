import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className={cn("relative", className)}>
      <select
        ref={ref}
        className="h-9 w-full appearance-none rounded-md border border-input bg-background/60 pl-3 pr-8 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&>option]:bg-popover"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  ),
);
NativeSelect.displayName = "NativeSelect";
