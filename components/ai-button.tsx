"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button, type ButtonProps } from "./ui/button";

export function AiButton({ loading, loadingText, children, ...props }: ButtonProps & { loading?: boolean; loadingText?: string }) {
  return (
    <Button disabled={loading || props.disabled} {...props}>
      {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}
