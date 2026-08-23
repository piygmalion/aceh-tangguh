/** Lightweight Database types mirroring public tables in Aceh Tangguh Supabase. */

export type ReportTopic =
  | "banjir"
  | "longsor"
  | "hunian"
  | "perlindungan"
  | "logistik"
  | "kesehatan"
  | "lainnya";

export type ReportStatus = "queued" | "published" | "rejected";

export type HazardKind = "banjir" | "longsor" | "gempa" | "kebakaran" | "lainnya";
export type HazardSeverity = "low" | "med" | "high";

export type MapLayerKind = "area" | "marker" | "boundary";
export type MapLayerSourceType = "geojson" | "pmtiles" | "api" | "mixed";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type EmptyRelationships = [];

export interface Database {
  public: {
    Tables: {
      reports: {
        Row: {
          id: string;
          topic: ReportTopic;
          description: string;
          longitude: number;
          latitude: number;
          place_name: string | null;
          consent_map_display: boolean;
          status: ReportStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          topic: ReportTopic;
          description: string;
          longitude: number;
          latitude: number;
          place_name?: string | null;
          consent_map_display: boolean;
          status?: ReportStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          topic?: ReportTopic;
          description?: string;
          longitude?: number;
          latitude?: number;
          place_name?: string | null;
          consent_map_display?: boolean;
          status?: ReportStatus;
          created_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      live_stats: {
        Row: {
          id: number;
          active_incidents: number;
          posko_count: number;
          reports_last_24h: number;
          updated_at: string;
        };
        Insert: {
          id?: number;
          active_incidents?: number;
          posko_count?: number;
          reports_last_24h?: number;
          updated_at?: string;
        };
        Update: {
          id?: number;
          active_incidents?: number;
          posko_count?: number;
          reports_last_24h?: number;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      hazard_status: {
        Row: {
          kind: HazardKind;
          label: string;
          count: number;
          severity: HazardSeverity | null;
          updated_at: string;
        };
        Insert: {
          kind: HazardKind;
          label: string;
          count?: number;
          severity?: HazardSeverity | null;
          updated_at?: string;
        };
        Update: {
          kind?: HazardKind;
          label?: string;
          count?: number;
          severity?: HazardSeverity | null;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      map_layers: {
        Row: {
          key: string;
          kind: MapLayerKind;
          title_id: string;
          title_en: string | null;
          description: string | null;
          source_path: string | null;
          source_type: MapLayerSourceType | null;
          pmtiles_path: string | null;
          legend: Json | null;
          enabled: boolean;
          sort_order: number;
          meta: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          kind: MapLayerKind;
          title_id: string;
          title_en?: string | null;
          description?: string | null;
          source_path?: string | null;
          source_type?: MapLayerSourceType | null;
          pmtiles_path?: string | null;
          legend?: Json | null;
          enabled?: boolean;
          sort_order?: number;
          meta?: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          kind?: MapLayerKind;
          title_id?: string;
          title_en?: string | null;
          description?: string | null;
          source_path?: string | null;
          source_type?: MapLayerSourceType | null;
          pmtiles_path?: string | null;
          legend?: Json | null;
          enabled?: boolean;
          sort_order?: number;
          meta?: Json;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      area_feature_meta: {
        Row: {
          id: string;
          layer_key: string;
          name: string;
          kabupaten: string | null;
          properties: Json;
          updated_at: string;
        };
        Insert: {
          id: string;
          layer_key: string;
          name: string;
          kabupaten?: string | null;
          properties?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          layer_key?: string;
          name?: string;
          kabupaten?: string | null;
          properties?: Json;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      profil_desa: {
        Row: {
          id: string;
          kode_desa_kelurahan: string | null;
          nama: string;
          kabupaten: string | null;
          kecamatan: string | null;
          kode_kabupaten: string | null;
          kode_kecamatan: string | null;
          kondisi_kode: string | null;
          kk: number | null;
          populasi: number | null;
          kk_terdampak: number | null;
          populasi_terdampak: number | null;
          korban_meninggal: number | null;
          korban_hilang: number | null;
          rumah_rr: number | null;
          rumah_rs: number | null;
          rumah_rb: number | null;
          total_rumah_rusak: number | null;
          payload: Json | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kode_desa_kelurahan?: string | null;
          nama: string;
          kabupaten?: string | null;
          kecamatan?: string | null;
          kode_kabupaten?: string | null;
          kode_kecamatan?: string | null;
          kondisi_kode?: string | null;
          kk?: number | null;
          populasi?: number | null;
          kk_terdampak?: number | null;
          populasi_terdampak?: number | null;
          korban_meninggal?: number | null;
          korban_hilang?: number | null;
          rumah_rr?: number | null;
          rumah_rs?: number | null;
          rumah_rb?: number | null;
          total_rumah_rusak?: number | null;
          payload?: Json | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kode_desa_kelurahan?: string | null;
          nama?: string;
          kabupaten?: string | null;
          kecamatan?: string | null;
          kode_kabupaten?: string | null;
          kode_kecamatan?: string | null;
          kondisi_kode?: string | null;
          kk?: number | null;
          populasi?: number | null;
          kk_terdampak?: number | null;
          populasi_terdampak?: number | null;
          korban_meninggal?: number | null;
          korban_hilang?: number | null;
          rumah_rr?: number | null;
          rumah_rs?: number | null;
          rumah_rb?: number | null;
          total_rumah_rusak?: number | null;
          payload?: Json | null;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
export type LiveStatsRow = Database["public"]["Tables"]["live_stats"]["Row"];
export type HazardStatusRow = Database["public"]["Tables"]["hazard_status"]["Row"];
export type MapLayerRow = Database["public"]["Tables"]["map_layers"]["Row"];
export type AreaFeatureMetaRow = Database["public"]["Tables"]["area_feature_meta"]["Row"];
export type ProfilDesaRow = Database["public"]["Tables"]["profil_desa"]["Row"];
