import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["id", "en"],
  defaultLocale: "id",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/peta": "/peta",
    "/lapor": "/lapor",
    "/data-bencana": {
      id: "/data-bencana",
      en: "/disaster-data",
    },
    "/anggaran-bencana": {
      id: "/anggaran-bencana",
      en: "/disaster-budget",
    },
    "/publikasi": {
      id: "/publikasi",
      en: "/publications",
    },
    "/sumber-data": {
      id: "/sumber-data",
      en: "/data-sources",
    },
    "/metodologi": {
      id: "/metodologi",
      en: "/methodology",
    },
    "/cuaca": {
      id: "/cuaca",
      en: "/weather",
    },
  },
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
