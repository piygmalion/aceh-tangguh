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
    "/admin": "/admin",
    "/admin/login": "/admin/login",
    "/admin/denied": "/admin/denied",
    "/admin/moderasi": "/admin/moderasi",
    "/admin/cms": "/admin/cms",
    "/admin/cms/publikasi": "/admin/cms/publikasi",
    "/admin/cms/kejadian": "/admin/cms/kejadian",
    "/admin/database": "/admin/database",
  },
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
