"use client";

import { Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { GuideAnswer, GuideHref } from "@/lib/panduan/types";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { GuideMessage } from "./GuideMessage";

export type GuideChatItem = {
  id: string;
  role: "user" | "bot";
  body: string;
  answer?: GuideAnswer;
};

const CHIP_KEYS = [
  "tour",
  "peringatan",
  "cuaca",
  "kejadian",
  "destana",
  "nomor",
  "lapor",
] as const;

export function GuidePanel({
  messages,
  busy,
  input,
  onInput,
  onSubmit,
  onClose,
  onChip,
  onLink,
  tourActive,
  onNextTour,
}: {
  messages: GuideChatItem[];
  busy: boolean;
  input: string;
  onInput: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onChip: (key: (typeof CHIP_KEYS)[number]) => void;
  onLink: (href: GuideHref, hash?: string) => void;
  tourActive: boolean;
  onNextTour: () => void;
}) {
  const t = useTranslations("panduan");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, busy]);

  return (
    <GlassPanel className="flex max-h-[70vh] w-[min(100%,380px)] flex-col overflow-hidden border border-[var(--glass-border)] shadow-[var(--shadow-elevated)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-3">
        <div>
          <p className={cn(TYPE_KICKER_CLASS, "text-[var(--accent-soft)]")}>{t("kicker")}</p>
          <p className="text-lg font-semibold leading-tight">{t("title")}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] text-[var(--text-dim)] hover:bg-[var(--primary-dim)] hover:text-[var(--primary)]"
          aria-label={t("close")}
        >
          <X size={18} />
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-base leading-relaxed"
      >
        {messages.map((item) => (
          <GuideMessage
            key={item.id}
            role={item.role}
            body={item.body}
            answer={item.answer}
            onLink={onLink}
          />
        ))}
        {busy ? (
          <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("thinking")}</p>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-[var(--glass-border)] px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {CHIP_KEYS.map((key) => (
            <Chip
              key={key}
              tone="ok"
              className={cn(TYPE_FLOOR_CLASS, "font-semibold")}
              onClick={() => onChip(key)}
            >
              {t(`chips.${key}`)}
            </Chip>
          ))}
        </div>
        {tourActive ? (
          <Button type="button" size="sm" variant="outline" onClick={onNextTour}>
            {t("nextStep")}
          </Button>
        ) : null}
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="sr-only" htmlFor="panduan-input">
            {t("placeholder")}
          </label>
          <input
            id="panduan-input"
            value={input}
            onChange={(event) => onInput(event.target.value)}
            placeholder={t("placeholder")}
            className="h-11 min-w-0 flex-1 rounded-full border border-[var(--glass-border)] bg-[var(--bg-raised)] px-4 text-base text-[var(--text)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="sm"
            className="h-11 w-11 shrink-0 px-0"
            aria-label={t("send")}
            disabled={busy || !input.trim()}
          >
            <Send size={16} />
          </Button>
        </form>
        <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("disclaimer")}</p>
      </div>
    </GlassPanel>
  );
}
