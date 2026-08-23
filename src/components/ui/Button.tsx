import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-hover)] hover:shadow-md active:scale-[0.98]",
  ghost:
    "bg-transparent text-[var(--text)] hover:bg-[var(--accent-dim)] active:scale-[0.98]",
  outline:
    "border border-[var(--glass-border)] bg-transparent text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] active:scale-[0.98]",
  danger:
    "bg-[var(--danger)] text-white shadow-sm hover:brightness-110 active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  leftIcon,
  rightIcon,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
