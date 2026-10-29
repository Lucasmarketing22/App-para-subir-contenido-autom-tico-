"use client";

import { useApp } from "@/lib/app-context";
import type { LeadStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const VARIANT = { new: "info", contacted: "warning", booked: "success", lost: "danger" } as const;

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { t } = useApp();
  return <Badge variant={VARIANT[status]}>{t(`crm.status.${status}`)}</Badge>;
}
