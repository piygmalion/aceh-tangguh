import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["id", "en"],
  defaultLocale: "id",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/preview/beranda": {
      id: "/preview/beranda",
      en: "/preview/beranda",
    },
    "/peta": "/peta",
    "/lapor": "/lapor",
    "/lapor/kejadian": "/lapor/kejadian",
    "/lapor/penanganan": "/lapor/penanganan",
    "/data-bencana": {
      id: "/data-bencana",
      en: "/disaster-data",
    },
    "/analisis-data": {
      id: "/analisis-data",
      en: "/disaster-analysis",
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
    "/admin": "/admin",
    "/admin/operasi": "/admin/operasi",
    "/admin/login": "/admin/login",
    "/admin/set-password": "/admin/set-password",
    "/admin/denied": "/admin/denied",
    "/admin/moderasi": "/admin/moderasi",
    "/admin/cms": "/admin/cms",
    "/admin/cms/publikasi": "/admin/cms/publikasi",
    "/admin/cms/kejadian": "/admin/cms/kejadian",
    "/admin/database": "/admin/database",
    "/admin/staf": "/admin/staf",
    "/admin/sik/kejadian": "/admin/sik/kejadian",
    "/admin/sik/kejadian/baru": "/admin/sik/kejadian/baru",
    "/admin/sik/kejadian/calon": "/admin/sik/kejadian/calon",
    "/admin/sik/kejadian/[id]": "/admin/sik/kejadian/[id]",
    "/admin/sik/kejadian/[id]/cetak": "/admin/sik/kejadian/[id]/cetak",
    "/admin/sik/sdb": "/admin/sik/sdb",
    "/admin/sik/master": "/admin/sik/master",
    "/admin/sik/logistik": "/admin/sik/logistik",
    "/admin/sik/destana": "/admin/sik/destana",
    "/admin/sik/rehab": "/admin/sik/rehab",
    "/admin/sik/disabilitas": "/admin/sik/disabilitas",
    "/admin/sik/publik": "/admin/sik/publik",
    "/destana": {
      id: "/destana",
      en: "/destana",
    },
    "/nomor-penting": {
      id: "/nomor-penting",
      en: "/emergency-contacts",
    },
    "/pelatihan": {
      id: "/pelatihan",
      en: "/training",
    },
    "/mitra": {
      id: "/mitra",
      en: "/partners",
    },
    "/brief/[ymd]": {
      id: "/brief/[ymd]",
      en: "/brief/[ymd]",
    },
    "/admin/daily-brief": "/admin/daily-brief",
    "/admin/anggaran": "/admin/anggaran",
  },
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
