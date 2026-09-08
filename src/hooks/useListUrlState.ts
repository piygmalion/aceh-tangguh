"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { applyListPatch } from "@/lib/list-url";

export function useListUrlState<T extends { page: number }>(
  parse: (params: URLSearchParams) => T,
  toParams: (state: T) => URLSearchParams,
  facetKeys: readonly (keyof T)[]
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(() => parse(searchParams), [parse, searchParams]);

  const replace = useCallback(
    (patch: Partial<T>) => {
      const next = applyListPatch(state, patch, facetKeys);
      const qs = toParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [facetKeys, pathname, router, state, toParams]
  );

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return { state, replace, reset };
}
