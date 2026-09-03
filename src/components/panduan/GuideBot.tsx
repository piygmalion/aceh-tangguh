"use client";

import { Compass, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useState } from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import { composeGuideAnswer, composeTourStep, loadGuideContext, matchGuideIntent } from "@/lib/panduan";
import { HOME_TOUR_STEPS } from "@/lib/panduan/tour-steps";
import type { GuideHref, GuideLocale } from "@/lib/panduan/types";
import { shouldShowGuideBot } from "@/lib/panduan/match";
import { GuidePanel, type GuideChatItem } from "./GuidePanel";
import { consumeQueuedTour, highlightTourTarget, queueTourTarget } from "./runGuideTour";

const CHIP_QUERY: Record<
  "tour" | "peringatan" | "cuaca" | "kejadian" | "destana" | "nomor" | "lapor",
  { id: string; en: string }
> = {
  tour: { id: "mulai tur", en: "start tour" },
  peringatan: { id: "peringatan dini", en: "early warning" },
  cuaca: { id: "cuaca", en: "weather" },
  kejadian: { id: "kejadian aktif", en: "active incidents" },
  destana: { id: "destana", en: "destana" },
  nomor: { id: "nomor penting", en: "emergency contacts" },
  lapor: { id: "cara lapor", en: "how to report" },
};

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function GuideBot() {
  const t = useTranslations("panduan");
  const locale = useLocale() as GuideLocale;
  const pathname = usePathname();
  const router = useRouter();
  const dialogId = useId();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<GuideChatItem[]>([]);
  const [tourIndex, setTourIndex] = useState<number | null>(null);

  const visible = shouldShowGuideBot(pathname);

  const goTour = useCallback(
    (href: GuideHref, hash?: string) => {
      if (href === "/peta") {
        router.push("/peta");
        return;
      }
      if (pathname === href) {
        if (hash) highlightTourTarget(hash);
        return;
      }
      queueTourTarget(href, hash);
      router.push(href);
    },
    [pathname, router]
  );

  useEffect(() => {
    if (!visible) return;
    const pending = consumeQueuedTour(pathname);
    if (pending?.hash) {
      const id = window.requestAnimationFrame(() => highlightTourTarget(pending.hash!));
      return () => window.cancelAnimationFrame(id);
    }
  }, [pathname, visible]);

  useEffect(() => {
    if (!open || !visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, visible]);

  const pushWelcome = useCallback(() => {
    const match = matchGuideIntent(locale === "en" ? "about aceh tangguh" : "apa itu aceh tangguh", locale);
    const answer = composeGuideAnswer(match, { failed: [] }, locale);
    setMessages([
      {
        id: nextId("bot"),
        role: "bot",
        body: answer.body,
        answer,
      },
    ]);
  }, [locale]);

  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0) pushWelcome();
  };

  const handleQuery = useCallback(
    async (text: string) => {
      const query = text.trim();
      if (!query || busy) return;
      setBusy(true);
      setInput("");
      setMessages((current) => [
        ...current,
        { id: nextId("user"), role: "user", body: query },
      ]);

      try {
        const match = matchGuideIntent(query, locale);
        if (match.intent === "tour") {
          setTourIndex(0);
          const answer = composeTourStep(0, locale);
          setMessages((current) => [
            ...current,
            { id: nextId("bot"), role: "bot", body: answer.body, answer },
          ]);
          if (answer.tour) goTour(answer.tour.href, answer.tour.hash);
          return;
        }

        setTourIndex(null);
        const ctx = await loadGuideContext(match, locale);
        const answer = composeGuideAnswer(match, ctx, locale);
        setMessages((current) => [
          ...current,
          { id: nextId("bot"), role: "bot", body: answer.body, answer },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, goTour, locale]
  );

  const handleNextTour = () => {
    const current = tourIndex ?? 0;
    const next = current + 1;
    if (next >= HOME_TOUR_STEPS.length) {
      setTourIndex(null);
      return;
    }
    setTourIndex(next);
    const answer = composeTourStep(next, locale);
    setMessages((prev) => [
      ...prev,
      { id: nextId("bot"), role: "bot", body: answer.body, answer },
    ]);
    if (answer.tour) goTour(answer.tour.href, answer.tour.hash);
  };

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed bottom-20 right-3 z-[55] flex flex-col items-end gap-2 sm:bottom-24 sm:right-6">
      {open ? (
        <div className="pointer-events-auto" id={dialogId} role="dialog" aria-label={t("title")}>
          <GuidePanel
            messages={messages}
            busy={busy}
            input={input}
            onInput={setInput}
            onSubmit={() => void handleQuery(input)}
            onClose={() => setOpen(false)}
            onChip={(key) => void handleQuery(CHIP_QUERY[key][locale === "en" ? "en" : "id"])}
            onLink={goTour}
            tourActive={tourIndex != null && tourIndex < HOME_TOUR_STEPS.length - 1}
            onNextTour={handleNextTour}
          />
        </div>
      ) : null}
      <button
        type="button"
        aria-label={open ? t("close") : t("open")}
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-fg)] shadow-[var(--shadow-elevated)] transition duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.98]"
      >
        {open ? <X size={22} /> : <Compass size={22} strokeWidth={2.25} />}
      </button>
    </div>
  );
}
