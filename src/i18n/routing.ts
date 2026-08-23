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
    "/sumber-data": {
      id: "/sumber-data",
      en: "/data-sources",
    },
    "/metodologi": {
      id: "/metodologi",
      en: "/methodology",
    },
  },
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
