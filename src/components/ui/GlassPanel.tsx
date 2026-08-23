import type { ElementType, ReactNode } from "react";

export function GlassPanel({
  as: Tag = "div",
  children,
  className = "",
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag className={`relative glass rounded-2xl transition duration-200 ${className}`}>
      {children}
    </Tag>
  );
}
