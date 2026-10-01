"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import { composeGuideAnswer, composeTourStep, loadGuideContext, matchGuideIntent } from "@/lib/panduan";
import { askGroundedLlm } from "@/lib/panduan/ask";
import { mergeFaqCatalog, STATIC_GUIDE_FAQ, type GuideFaqEntry } from "@/lib/panduan/faq";
import { shouldUseGroundedLlm } from "@/lib/panduan/llm-gate";
import {
  consumeOpenTanggapi,
  consumeTanggapiSeed,
  hasSeenTanggapiBubble,
  markTanggapiBubbleSeen,
  TANGGAPI_OPEN_EVENT,
} from "@/lib/panduan/open-tanggapi";
import {
  clearTanggapiThread,
  loadTanggapiThread,
  saveTanggapiThread,
  type StoredThreadMessage,
} from "@/lib/panduan/thread-store";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { chipsForPathname, type GuideChipKey, welcomeQueryForPath } from "@/lib/panduan/page-context";
import { HOME_TOUR_STEPS } from "@/lib/panduan/tour-steps";
import type { GuideAnswer, GuideHref, GuideLocale, GuideSlots } from "@/lib/panduan/types";
import { shouldShowGuideBot } from "@/lib/panduan/match";
import { logUnknownIntent } from "@/lib/panduan/unknown";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { GuidePanel, type GuideChatItem } from "./GuidePanel";
import { consumeQueuedTour, highlightTourTarget, queueTourTarget } from "./runGuideTour";
import { TanggapiAvatar } from "./TanggapiAvatar";

const CHIP_QUERY: Record<GuideChipKey, { id: string; en: string }> = {
  tour: { id: "mulai tur", en: "start tour" },
  peringatan: { id: "peringatan dini", en: "early warning" },
  cuaca: { id: "cuaca", en: "weather" },
  kejadian: { id: "kejadian aktif", en: "active incidents" },
  analisisData: { id: "analisis data", en: "disaster analysis" },
  destana: { id: "destana", en: "destana" },
  nomor: { id: "nomor penting", en: "emergency contacts" },
  lapor: { id: "cara lapor", en: "how to report" },
  pelatihan: { id: "pelatihan", en: "training" },
  mitra: { id: "mitra", en: "partners" },
  publikasi: { id: "publikasi", en: "publications" },
  risetBanding: { id: "bandingkan destana dan IRBI", en: "compare destana and IRBI" },
  risetDibi: { id: "bagaimana membaca DIBI", en: "how to read DIBI" },
};

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function storedToChat(item: StoredThreadMessage): GuideChatItem {
  return {
    id: item.id,
    role: item.role,
    body: item.body,
    answer:
      item.role === "bot"
        ? {
            intent: item.intent ?? "unknown",
            body: item.body,
            links: item.links ?? [],
            source: item.source,
            lead: item.lead,
            clauses: item.clauses,
          }
        : undefined,
  };
}

function chatToStored(item: GuideChatItem): StoredThreadMessage {
  return {
    id: item.id,
    role: item.role,
    body: item.body,
    intent: item.answer?.intent,
    links: item.answer?.links,
    source: item.answer?.source,
    lead: item.answer?.lead,
    clauses: item.answer?.clauses,
  };
}

function safeFallbackAnswer(locale: GuideLocale): GuideAnswer {
  return {
    intent: "unknown",
    body:
      locale === "en"
        ? "Tanggapi could not finish that answer. Open emergency contacts, or call 112 in an emergency. I do not invent casualty figures."
        : "Tanggapi belum bisa merangkai jawaban itu. Buka nomor penting, atau hubungi 112 jika darurat. Saya tidak mengarang angka korban.",
    links: [{ href: "/nomor-penting", labelKey: "linkNomor" }],
  };
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function GuideBot() {
  const t = useTranslations("panduan");
  const locale = useLocale() as GuideLocale;
  const pathname = usePathname();
  const router = useRouter();
  const dialogId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();
  const motionMs = reducedMotion ? 0 : undefined;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<GuideChatItem[]>([]);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [session, setSession] = useState<GuideSlots>({});
  const [faq, setFaq] = useState<GuideFaqEntry[]>(STATIC_GUIDE_FAQ);
  const [showBubble, setShowBubble] = useState(false);
  const [threadReady, setThreadReady] = useState(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const welcomeLock = useRef(false);

  const visible = shouldShowGuideBot(pathname);
  const chipKeys = chipsForPathname(pathname);

  const dismissBubble = useCallback(() => {
    markTanggapiBubbleSeen();
    setShowBubble(false);
  }, []);

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
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (open) {
        setOpen(false);
        return;
      }
      if (showBubble) dismissBubble();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissBubble, open, showBubble, visible]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const id = window.requestAnimationFrame(() => {
        document.getElementById("panduan-input")?.focus();
      });
      return () => window.cancelAnimationFrame(id);
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      fabRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    if (!root) return;
    const onTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    root.addEventListener("keydown", onTab);
    return () => root.removeEventListener("keydown", onTab);
  }, [chipKeys, messages, open]);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicApi("/api/sik/public?kind=panduan-faq")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { items?: GuideFaqEntry[] };
        if (!cancelled && Array.isArray(data.items) && data.items.length) {
          setFaq(mergeFaqCatalog(data.items));
        }
      })
      .catch(() => {
        // Static catalog stays in place.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const thread = loadTanggapiThread();
    if (thread?.messages.length) {
      setMessages(thread.messages.map(storedToChat));
      setSession(thread.slots);
    }
    setThreadReady(true);
  }, []);

  useEffect(() => {
    if (!threadReady) return;
    saveTanggapiThread({ messages: messages.map(chatToStored), slots: session });
  }, [messages, session, threadReady]);

  const rememberSlots = useCallback((match: { kabupaten?: string; jenis?: string; year?: number; intent: string }) => {
    setSession((prev) => ({
      kabupaten: match.kabupaten ?? prev.kabupaten,
      jenis: match.jenis ?? prev.jenis,
      year: match.year ?? prev.year,
      lastIntent: match.intent === "unknown" ? prev.lastIntent : (match.intent as GuideSlots["lastIntent"]),
    }));
  }, []);

  const pushWelcome = useCallback(async () => {
    try {
      const query = welcomeQueryForPath(pathname, locale);
      const match = matchGuideIntent(query, locale, { ...sessionRef.current, faq });
      const ctx = await loadGuideContext(match, locale);
      const answer = composeGuideAnswer(match, ctx, locale);
      rememberSlots(match);
      setMessages([
        {
          id: nextId("bot"),
          role: "bot",
          body: answer.body,
          answer,
        },
      ]);
    } catch {
      const fallback = safeFallbackAnswer(locale);
      setMessages([
        {
          id: nextId("bot"),
          role: "bot",
          body: fallback.body,
          answer: fallback,
        },
      ]);
    }
  }, [faq, locale, pathname, rememberSlots]);

  const handleOpen = useCallback(() => {
    dismissBubble();
    setOpen(true);
    const seed = consumeTanggapiSeed();
    if (seed) setInput(seed);
  }, [dismissBubble]);

  useEffect(() => {
    if (!open || !threadReady || messages.length > 0 || welcomeLock.current) return;
    welcomeLock.current = true;
    void pushWelcome();
  }, [messages.length, open, pushWelcome, threadReady]);

  const handleClearThread = useCallback(() => {
    clearTanggapiThread();
    setSession({});
    setMessages([]);
    welcomeLock.current = false;
  }, []);

  useEffect(() => {
    if (!visible || open) {
      setShowBubble(false);
      return;
    }
    setShowBubble(!hasSeenTanggapiBubble());
  }, [open, visible]);

  useEffect(() => {
    if (consumeOpenTanggapi()) handleOpen();
    const onOpen = () => handleOpen();
    window.addEventListener(TANGGAPI_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(TANGGAPI_OPEN_EVENT, onOpen);
  }, [handleOpen]);

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
        const match = matchGuideIntent(query, locale, { ...sessionRef.current, faq });
        rememberSlots(match);
        if (match.intent === "unknown") {
          void logUnknownIntent({
            query,
            locale,
            reason: match.reason,
            pathname,
          });
        }
        if (match.intent === "tour" && !match.faq) {
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
        if (shouldUseGroundedLlm(match)) {
          try {
            const grounded = await askGroundedLlm({
              query,
              locale,
              pathname,
              slots: sessionRef.current,
            });
            if (grounded) {
              setMessages((current) => [
                ...current,
                { id: nextId("bot"), role: "bot", body: grounded.body, answer: grounded },
              ]);
              return;
            }
          } catch {
            // V1 below — do not leave the user bubble unanswered.
          }
        }

        try {
          const ctx = await loadGuideContext(match, locale);
          const answer = composeGuideAnswer(match, ctx, locale);
          setMessages((current) => [
            ...current,
            { id: nextId("bot"), role: "bot", body: answer.body, answer },
          ]);
        } catch {
          const fallback = composeGuideAnswer(match, { failed: [] }, locale);
          setMessages((current) => [
            ...current,
            { id: nextId("bot"), role: "bot", body: fallback.body, answer: fallback },
          ]);
        }
      } catch {
        const fallback = safeFallbackAnswer(locale);
        setMessages((current) => [
          ...current,
          { id: nextId("bot"), role: "bot", body: fallback.body, answer: fallback },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, faq, goTour, locale, pathname, rememberSlots]
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

  if (!visible && !open) return null;

  return (
    <div className="pointer-events-none fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] right-3 z-[55] flex flex-col items-end gap-2 sm:right-6">
      <AnimatePresence>
        {open ? (
          <motion.div
            ref={dialogRef}
            key="panel"
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: motionMs ?? 0.18 }}
            className="pointer-events-auto origin-bottom-right"
          >
            <GuidePanel
              messages={messages}
              busy={busy}
              input={input}
              onInput={setInput}
              onSubmit={() => void handleQuery(input)}
              onClose={() => setOpen(false)}
              chipKeys={chipKeys}
              onChip={(key) => void handleQuery(CHIP_QUERY[key][locale === "en" ? "en" : "id"])}
              onLink={goTour}
              tourActive={tourIndex != null && tourIndex < HOME_TOUR_STEPS.length - 1}
              onNextTour={handleNextTour}
              session={session}
              onClearThread={handleClearThread}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {visible && showBubble && !open ? (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: motionMs ?? 0.16 }}
            className="pointer-events-auto relative mb-1 max-w-[16rem]"
          >
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-raised)] px-3 py-2 shadow-[var(--shadow)]">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={handleOpen}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block text-sm font-semibold text-[var(--text)]">{t("askHero")}</span>
                  <span className={cn("mt-0.5 block text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                    {t("heroHint")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={dismissBubble}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-dim)] hover:bg-[var(--primary-dim)] hover:text-[var(--primary)]"
                  aria-label={t("dismissInvite")}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <span
              aria-hidden
              className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-b border-r border-[var(--glass-border)] bg-[var(--bg-raised)]"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      {visible ? (
        <button
          ref={fabRef}
          type="button"
          aria-label={open ? t("close") : t("open")}
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          onClick={() => (open ? setOpen(false) : handleOpen())}
          className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow-elevated)] transition duration-200 hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.98]"
        >
          {open ? <X size={22} /> : <TanggapiAvatar size="fab" />}
        </button>
      ) : null}
    </div>
  );
}
