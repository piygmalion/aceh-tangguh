import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isStaticExport =
  process.env.STATIC_EXPORT === "1" || process.env.GITHUB_PAGES === "1";

const pagesBase = (
  process.env.NEXT_PUBLIC_BASE_PATH ||
  process.env.PAGES_BASE_PATH ||
  "/aceh-tangguh"
).replace(/\/$/, "");

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["react-map-gl", "maplibre-gl"],
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, "mapbox-gl": "maplibre-gl" };
    return config;
  },
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
        images: { unoptimized: true },
        basePath: pagesBase,
        assetPrefix: pagesBase,
      }
    : {}),
};

export default withNextIntl(nextConfig);
