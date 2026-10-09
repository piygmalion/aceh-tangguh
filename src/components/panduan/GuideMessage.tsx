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
  messageId,
}: {
  role: "user" | "bot";
  body: string;
  answer?: GuideAnswer;
  onLink: (href: GuideHref, hash?: string) => void;
  messageId?: string;
}) {
  const t = useTranslations("panduan");

  if (role === "user") {
    return (
      <div className="flex justify-end" data-guide-message={messageId}>
        <p className="max-w-[85%] rounded-2xl bg-[var(--primary-dim)] px-3.5 py-2 text-[var(--primary)]">
          {body}
        </p>
      </div>
    );
  }

  const card = answer?.clauses && answer.clauses.length === 4;

  return (
    <div className="space-y-2" data-guide-message={messageId}>
      {card ? (
        <div className="max-w-[95%] overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-raised)] shadow-[var(--shadow)]">
          {answer.lead ? (
            <p className="border-b border-[var(--glass-border)] px-3.5 py-2 text-[var(--text)]">
              {answer.lead}
            </p>
          ) : null}
          <ul className="divide-y divide-[var(--glass-border)]">
            {answer.clauses?.map((clause) => (
              <li
                key={clause.slice(0, 48)}
                className={cn("px-3.5 py-2 text-[var(--text)]", TYPE_FLOOR_CLASS)}
              >
                {clause}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="max-w-[95%] rounded-2xl bg-[var(--bg-raised)] px-3.5 py-2 text-[var(--text)] shadow-[var(--shadow)]">
          {body}
        </p>
      )}
      {answer?.source ? (
        <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{answer.source}</p>
      ) : null}
      {answer?.links.length ? (
        <div className="flex flex-wrap gap-1.5">
          {answer.links.map((item) => (
            <Chip
              key={`${item.href}:${item.hash ?? ""}:${item.labelKey}`}
              tone={item.accent ? "accent" : "ok"}
              className={cn(TYPE_FLOOR_CLASS, "font-semibold")}
              onClick={() => onLink(item.href, item.hash)}
            >
              {t.has(item.labelKey) ? t(item.labelKey) : item.labelKey}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
