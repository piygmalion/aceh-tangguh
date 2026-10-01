import type { AbstractIntlMessages } from "next-intl";

/**
 * Client bundles on public pages must not include recovery or budget copy.
 * The staff console layout passes the full catalog back in.
 */
export function messagesForPublicClient(
  messages: AbstractIntlMessages
): AbstractIntlMessages {
  const next: AbstractIntlMessages = { ...messages };
  delete next.anggaranBencana;
  delete next.prrpkaChart;
  const beranda = next.beranda;
  if (beranda && typeof beranda === "object" && !Array.isArray(beranda)) {
    const copy: AbstractIntlMessages = { ...(beranda as AbstractIntlMessages) };
    delete copy.pemulihan;
    next.beranda = copy;
  }
  return next;
}
