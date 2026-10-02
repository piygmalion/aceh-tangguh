"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { angka, desimal } from "./format";

/**
 * Prints the final figure immediately. A short fade-in is opacity only, so a
 * screenshot never reads a spring value on the way to the real total.
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
  const locale = useLocale();
  const reduced = useReducedMotion();
  const text = decimals === 0 ? angka(value, locale) : desimal(value, decimals, locale);
  const fade = reduced === false;

  return (
    <span className={cn("tabular-nums", className)}>
      <span className="sr-only">{text}</span>
      <motion.span
        aria-hidden
        initial={fade ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={fade ? { duration: 0.3, ease: "easeOut" } : { duration: 0 }}
      >
        {text}
      </motion.span>
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
  tone?: "text" | "primary" | "accent" | "danger" | "warn" | "band";
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const toneClass = {
    text: "text-[var(--text)]",
    primary: "text-[var(--primary)]",
    accent: "text-[var(--accent)]",
    danger: "text-[var(--danger)]",
    warn: "text-[var(--warn)]",
    band: "text-[var(--band-fg)]",
  }[tone];

  const sizeClass = {
    sm: "text-[1.5rem] sm:text-[1.75rem]",
    md: "text-[2rem] sm:text-[2.25rem]",
    lg: "text-[2.5rem] sm:text-[3rem]",
    xl: "type-figure-xl",
  }[size];

  const adjunct = tone === "band" ? "text-[var(--band-fg)]" : null;

  return (
    <p className={cn("flex items-baseline gap-1.5 font-semibold", toneClass)}>
      {prefix ? (
        <span className={cn("text-[0.8125rem] font-medium", adjunct ?? "opacity-70")}>{prefix}</span>
      ) : null}
      <span className={cn(sizeClass, size !== "xl" && "leading-[1.12] tracking-[-0.04em]")}>
        <StatNumber value={value} decimals={decimals} />
      </span>
      {unit ? (
        <span
          className={cn(
            "text-[0.8125rem] font-medium uppercase tracking-[0.08em]",
            adjunct ?? "opacity-65",
          )}
        >
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
          <p className={cn("type-kicker mb-2.5 text-[var(--eyebrow)]")}>{kicker}</p>
        ) : null}
        <h2 id={id} className="type-h2">
          {title}
        </h2>
        {lead ? (
          <p className="type-lead mt-3 text-[var(--text-dim)]">
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
