export {
  createServerClient,
  createServerClientOrThrow,
  type TypedSupabaseClient,
} from "./server";
export { createBrowserClient } from "./client";
export {
  trySupabaseThenFixture,
  fetchAllRows,
  readDocumentPayload,
  asRecord,
  isNonEmptyArray,
  type DomainSource,
  type Loaded,
} from "./fallback";
export type {
  Database,
  ReportRow,
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
