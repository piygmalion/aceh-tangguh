import { createServerClient } from "@/lib/supabase/server";
import { faqFromCmsRow, mergeFaqCatalog, type GuideFaqEntry } from "./faq";

/** Published CMS FAQ rows only — same select as GET /api/sik/public?kind=panduan-faq. */
export async function loadPublishedFaqCms(): Promise<GuideFaqEntry[]> {
  const client = createServerClient();
  if (!client) return [];
  const { data } = await client
    .from("panduan_faq")
    .select("id, pola, intent, body_id, body_en, href, hash, label_key, urutan")
    .eq("published", true)
    .order("urutan");
  return (data ?? [])
    .map((row) =>
      faqFromCmsRow({
        id: typeof row.id === "string" ? row.id : undefined,
        pola: typeof row.pola === "string" ? row.pola : undefined,
        intent: typeof row.intent === "string" ? row.intent : undefined,
        body_id: typeof row.body_id === "string" ? row.body_id : undefined,
        body_en: typeof row.body_en === "string" ? row.body_en : undefined,
        href: typeof row.href === "string" ? row.href : undefined,
        hash: typeof row.hash === "string" ? row.hash : null,
        label_key: typeof row.label_key === "string" ? row.label_key : undefined,
      })
    )
    .filter((row): row is GuideFaqEntry => Boolean(row));
}

/** Static catalog plus published CMS rows — what the widget and ask route rematch against. */
export async function loadGuideFaqCatalog(): Promise<GuideFaqEntry[]> {
  return mergeFaqCatalog(await loadPublishedFaqCms());
}
