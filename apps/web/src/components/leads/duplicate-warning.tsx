"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { Lead } from "@realestate/shared";
import { formatRelativeTime } from "@/lib/utils";

interface DuplicateWarningProps {
  phoneMatch?: Lead;
  emailMatch?: Lead;
}

export function DuplicateWarning({
  phoneMatch,
  emailMatch,
}: DuplicateWarningProps) {
  const match = phoneMatch ?? emailMatch;
  if (!match) return null;
  const reason = phoneMatch ? "phone number" : "email";

  return (
    <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-0.5">
        <p>
          An existing lead with this {reason} was found:{" "}
          <Link
            href={`/leads/${match.id}`}
            className="font-medium underline-offset-2 hover:underline"
          >
            {match.name}
          </Link>{" "}
          · {match.phone}
          {match.email ? ` · ${match.email}` : ""}
        </p>
        <p className="text-xs text-amber-800/80">
          Last updated {formatRelativeTime(match.updatedAt)}. You can still
          save this as a new lead — phone uniqueness is a warning, not a block.
        </p>
      </div>
    </div>
  );
}
