import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["react-map-gl", "maplibre-gl"],
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, "mapbox-gl": "maplibre-gl" };
    return config;
  },
};
export default withNextIntl(nextConfig);
