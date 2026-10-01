export {
  createServerClient,
  createServerClientOrThrow,
  type TypedSupabaseClient,
} from "./server";
export { createBrowserClient } from "./client";
export { createAuthServerClient } from "./ssr";
export {
  trySupabaseThenFixture,
  fetchAllRows,
  readDocumentPayload,
  asRecord,
  isNonEmptyArray,
  type DomainSource,
  type Loaded,
  type LoadedWithFallback,
  type FallbackReason,
} from "./fallback";
export type {
  Database,
  AdminRole,
  ReportRow,
  AdminProfileRow,
  LiveStatsRow,
  HazardStatusRow,
  MapLayerRow,
  AreaFeatureMetaRow,
  KejadianBencanaRow,
  MarkerFeatureRow,
  AnggaranAnalisisRow,
  AnggaranKegiatanRow,
  PublikasiMetaRow,
  PublikasiRow,
  R3PSummaryRow,
  IrbiDocumentRow,
  DataDocumentRow,
  ProfilDesaRow,
  WeatherForecastRow,
} from "./types";
