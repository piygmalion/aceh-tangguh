"use client";

import { useTranslations } from "next-intl";
import { Chip } from "@/components/ui/Chip";
import type { GuideAnswer, GuideHref } from "@/lib/panduan/types";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export function GuideMessage({
  role,
  body,
  answer,
  onLink,
}: {
  role: "user" | "bot";
  body: string;
  answer?: GuideAnswer;
  onLink: (href: GuideHref, hash?: string) => void;
}) {
  const t = useTranslations("panduan");

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl bg-[var(--primary-dim)] px-3.5 py-2 text-[var(--primary)]">
          {body}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="max-w-[95%] rounded-2xl bg-[var(--bg-raised)] px-3.5 py-2 text-[var(--text)] shadow-[var(--shadow)]">
        {body}
      </p>
      {answer?.source ? (
        <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{answer.source}</p>
      ) : null}
      {answer?.links.length ? (
        <div className="flex flex-wrap gap-1.5">
          {answer.links.map((item) => (
            <Chip
              key={`${item.href}:${item.hash ?? ""}:${item.labelKey}`}
              tone={item.accent ? "warn" : "ok"}
              className={cn(
                TYPE_FLOOR_CLASS,
                "font-semibold",
                item.accent
                  ? "border-transparent bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  : ""
              )}
              onClick={() => onLink(item.href, item.hash)}
            >
              {t(item.labelKey)}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
