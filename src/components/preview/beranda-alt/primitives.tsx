"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { angka, desimal } from "./format";

/**
 * Counts up to `value` on first view, formatted for id-ID.
 * The shared NumberTicker formats en-US, which prints 2,526 where Aceh reads 2.526.
 */
export function StatNumber({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: 0 | 1 | 2;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 60, stiffness: 110 });
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });

  const format = (n: number) => (decimals === 0 ? angka(n) : desimal(n, decimals));

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      if (ref.current) ref.current.textContent = format(value);
      return;
    }
    motionValue.set(value);
    // format is derived from `decimals`, which is covered by the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, motionValue, reduced, value, decimals]);

  useEffect(
    () =>
      spring.on("change", (latest) => {
        if (ref.current) ref.current.textContent = format(latest);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spring, decimals],
  );

  return (
    <span className={cn("tabular-nums", className)}>
      {/* Assistive tech reads the real figure; the counter below is decoration only,
          otherwise every off-screen number is announced as zero. */}
      <span className="sr-only">{format(value)}</span>
      <span ref={ref} aria-hidden>
        {format(reduced ? value : 0)}
      </span>
    </span>
  );
}

/** Large figure plus its unit, sharing one baseline. */
export function Figure({
  value,
  unit,
  decimals = 0,
  prefix,
  tone = "text",
  size = "lg",
}: {
  value: number;
  unit?: string;
  decimals?: 0 | 1 | 2;
  prefix?: string;
  tone?: "text" | "primary" | "accent" | "danger" | "warn";
  size?: "sm" | "md" | "lg";
}) {
  const toneClass = {
    text: "text-[var(--text)]",
    primary: "text-[var(--primary)]",
    accent: "text-[var(--accent)]",
    danger: "text-[var(--danger)]",
    warn: "text-[var(--warn)]",
  }[tone];

  const sizeClass = {
    sm: "text-[1.5rem] sm:text-[1.75rem]",
    md: "text-[2rem] sm:text-[2.25rem]",
    lg: "text-[2.5rem] sm:text-[3rem]",
  }[size];

  return (
    <p className={cn("flex items-baseline gap-1.5 font-semibold", toneClass)}>
      {prefix ? (
        <span className="text-[0.55em] font-medium opacity-70">{prefix}</span>
      ) : null}
      <span className={cn(sizeClass, "leading-[1.05] tracking-[-0.04em]")}>
        <StatNumber value={value} decimals={decimals} />
      </span>
      {unit ? (
        <span className="text-[0.4em] font-medium uppercase tracking-[0.08em] opacity-65">
          {unit}
        </span>
      ) : null}
    </p>
  );
}

/**
 * Section heading. `kicker` is rationed across the page, so most sections pass
 * only a title and a lead.
 */
export function SectionHeading({
  kicker,
  title,
  lead,
  aside,
  id,
}: {
  kicker?: string;
  title: string;
  lead?: string;
  aside?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {kicker ? (
          <p className={cn("type-kicker mb-2.5 text-[var(--accent-soft)]")}>{kicker}</p>
        ) : null}
        <h2
          id={id}
          className="text-[1.6rem] font-semibold leading-[1.18] tracking-[-0.028em] sm:text-[2rem]"
        >
          {title}
        </h2>
        {lead ? (
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--text-dim)]">
            {lead}
          </p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

/**
 * Horizontal proportion bar. Width is a share of the row's own maximum.
 * Deliberately trackless: an unfilled rail behind every bar invites reading it as
 * "progress towards a target", which none of these figures are.
 */
export function Bar({ ratio, className }: { ratio: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <span className="block h-1.5 w-full">
      <span
        className={cn("block h-full rounded-full", className)}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

/** Attribution line under a data panel. Every figure on this page names its source. */
export function Sumber({
  children,
  href,
}: {
  children: ReactNode;
  href?: string;
}) {
  const text = (
    <span className="text-[var(--text-dim)]">{children}</span>
  );
  return (
    <p className={cn("mt-4", TYPE_FLOOR_CLASS)}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-[var(--border)] underline-offset-4 transition-colors hover:decoration-[var(--primary)]"
        >
          {text}
        </a>
      ) : (
        text
      )}
    </p>
  );
}

export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-muted)] motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export function PanelError({ children }: { children: ReactNode }) {
  return (
    <p
      className={cn(
        "rounded-2xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-[var(--text-dim)]",
        TYPE_FLOOR_CLASS,
      )}
    >
      {children}
    </p>
  );
}
