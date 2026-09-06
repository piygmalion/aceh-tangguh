"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  analisisStateToParams,
  parseAnalisisSearchParams,
  type AnalisisUrlState,
} from "@/lib/analisis-url";

export function useAnalisisUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(
    () => parseAnalisisSearchParams(searchParams),
    [searchParams]
  );

  const replace = useCallback(
    (patch: Partial<AnalisisUrlState>) => {
      const next = { ...state, ...patch };
      if (patch.kab !== undefined && patch.kec === undefined && patch.kab !== state.kab) {
        next.kec = "";
      }
      const params = analisisStateToParams(next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, state]
  );

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return { state, replace, reset };
}
