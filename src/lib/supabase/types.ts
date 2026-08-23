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

export type AdminRole = "super_admin" | "admin";

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
      admin_profiles: {
        Row: {
          user_id: string;
          role: AdminRole;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role: AdminRole;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role?: AdminRole;
          display_name?: string | null;
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
      laporan_pelapor: {
        Row: {
          id: string;
          nama_enc: string;
          nik_hash: string;
          nik_enc: string;
          telepon_enc: string | null;
          email_enc: string | null;
          kontak_darurat_enc: string | null;
          telepon_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nama_enc: string;
          nik_hash: string;
          nik_enc: string;
          telepon_enc?: string | null;
          email_enc?: string | null;
          kontak_darurat_enc?: string | null;
          telepon_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nama_enc?: string;
          nik_hash?: string;
          nik_enc?: string;
          telepon_enc?: string | null;
          email_enc?: string | null;
          kontak_darurat_enc?: string | null;
          telepon_hash?: string | null;
          created_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      laporan_kejadian: {
        Row: {
          id: string;
          nomor_laporan: string;
          pelapor_id: string;
          jenis_bencana: string;
          status: string;
          latitude: number;
          longitude: number;
          kabupaten_kota: string;
          kecamatan: string | null;
          desa: string | null;
          provinsi: string;
          skor_urgensi: number;
          tampil_di_peta: boolean;
          moderator_id: string | null;
          moderator_unit: string;
          catatan_moderator: string | null;
          disetujui_at: string | null;
          jawaban_json: Json;
          addendum: string | null;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nomor_laporan: string;
          pelapor_id: string;
          jenis_bencana: string;
          status?: string;
          latitude: number;
          longitude: number;
          kabupaten_kota: string;
          kecamatan?: string | null;
          desa?: string | null;
          provinsi?: string;
          skor_urgensi?: number;
          tampil_di_peta?: boolean;
          moderator_id?: string | null;
          moderator_unit?: string;
          catatan_moderator?: string | null;
          disetujui_at?: string | null;
          jawaban_json?: Json;
          addendum?: string | null;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nomor_laporan?: string;
          pelapor_id?: string;
          jenis_bencana?: string;
          status?: string;
          latitude?: number;
          longitude?: number;
          kabupaten_kota?: string;
          kecamatan?: string | null;
          desa?: string | null;
          provinsi?: string;
          skor_urgensi?: number;
          tampil_di_peta?: boolean;
          moderator_id?: string | null;
          moderator_unit?: string;
          catatan_moderator?: string | null;
          disetujui_at?: string | null;
          jawaban_json?: Json;
          addendum?: string | null;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      laporan_penanganan: {
        Row: {
          id: string;
          nomor_laporan: string;
          pelapor_id: string;
          jenis_bencana: string;
          tipe_laporan: string;
          fase_penanganan: string | null;
          status: string;
          status_kebutuhan_sisa: string | null;
          tanggal_penanganan: string;
          jam_penanganan: string | null;
          latitude: number;
          longitude: number;
          kabupaten_kota: string;
          kecamatan: string | null;
          desa: string | null;
          provinsi: string;
          deskripsi_penanganan: string;
          jumlah_penerima_estimasi: number | null;
          rating_kepuasan: number | null;
          tampil_di_peta: boolean;
          jawaban_json: Json;
          addendum: string | null;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nomor_laporan: string;
          pelapor_id: string;
          jenis_bencana: string;
          tipe_laporan: string;
          fase_penanganan?: string | null;
          status?: string;
          status_kebutuhan_sisa?: string | null;
          tanggal_penanganan: string;
          jam_penanganan?: string | null;
          latitude: number;
          longitude: number;
          kabupaten_kota: string;
          kecamatan?: string | null;
          desa?: string | null;
          provinsi?: string;
          deskripsi_penanganan: string;
          jumlah_penerima_estimasi?: number | null;
          rating_kepuasan?: number | null;
          tampil_di_peta?: boolean;
          jawaban_json?: Json;
          addendum?: string | null;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nomor_laporan?: string;
          pelapor_id?: string;
          jenis_bencana?: string;
          tipe_laporan?: string;
          fase_penanganan?: string | null;
          status?: string;
          status_kebutuhan_sisa?: string | null;
          tanggal_penanganan?: string;
          jam_penanganan?: string | null;
          latitude?: number;
          longitude?: number;
          kabupaten_kota?: string;
          kecamatan?: string | null;
          desa?: string | null;
          provinsi?: string;
          deskripsi_penanganan?: string;
          jumlah_penerima_estimasi?: number | null;
          rating_kepuasan?: number | null;
          tampil_di_peta?: boolean;
          jawaban_json?: Json;
          addendum?: string | null;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      notifikasi_wa: {
        Row: {
          id: string;
          laporan_tipe: string;
          laporan_id: string;
          nomor_tujuan_enc: string;
          template_kode: string;
          payload_json: Json;
          status: string;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          laporan_tipe: string;
          laporan_id: string;
          nomor_tujuan_enc: string;
          template_kode: string;
          payload_json?: Json;
          status?: string;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          laporan_tipe?: string;
          laporan_id?: string;
          nomor_tujuan_enc?: string;
          template_kode?: string;
          payload_json?: Json;
          status?: string;
          created_at?: string;
          sent_at?: string | null;
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
      kejadian_bencana: {
        Row: {
          id: string;
          jenis_bencana: string;
          hari_tanggal: string | null;
          kabupaten: string | null;
          kecamatan: string | null;
          desa: string | null;
          longitude: number | null;
          latitude: number | null;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          id: string;
          jenis_bencana: string;
          hari_tanggal?: string | null;
          kabupaten?: string | null;
          kecamatan?: string | null;
          desa?: string | null;
          longitude?: number | null;
          latitude?: number | null;
          payload: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          jenis_bencana?: string;
          hari_tanggal?: string | null;
          kabupaten?: string | null;
          kecamatan?: string | null;
          desa?: string | null;
          longitude?: number | null;
          latitude?: number | null;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      marker_features: {
        Row: {
          id: string;
          layer: string;
          title: string | null;
          status: string | null;
          kabupaten: string | null;
          longitude: number;
          latitude: number;
          properties: Json;
          updated_at: string;
        };
        Insert: {
          id: string;
          layer: string;
          title?: string | null;
          status?: string | null;
          kabupaten?: string | null;
          longitude: number;
          latitude: number;
          properties?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          layer?: string;
          title?: string | null;
          status?: string | null;
          kabupaten?: string | null;
          longitude?: number;
          latitude?: number;
          properties?: Json;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      anggaran_analisis: {
        Row: {
          tahun: number;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          tahun: number;
          payload: Json;
          updated_at?: string;
        };
        Update: {
          tahun?: number;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      anggaran_kegiatan: {
        Row: {
          id: string;
          tahun: number;
          nama: string | null;
          skpd: string | null;
          fase: string | null;
          kategori: string | null;
          total_rp: number | null;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          id: string;
          tahun: number;
          nama?: string | null;
          skpd?: string | null;
          fase?: string | null;
          kategori?: string | null;
          total_rp?: number | null;
          payload: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tahun?: number;
          nama?: string | null;
          skpd?: string | null;
          fase?: string | null;
          kategori?: string | null;
          total_rp?: number | null;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "anggaran_kegiatan_tahun_fkey";
            columns: ["tahun"];
            isOneToOne: false;
            referencedRelation: "anggaran_analisis";
            referencedColumns: ["tahun"];
          },
        ];
      };
      publikasi_meta: {
        Row: {
          id: number;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          id?: number;
          payload: Json;
          updated_at?: string;
        };
        Update: {
          id?: number;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      publikasi: {
        Row: {
          slug: string;
          title: string;
          description: string | null;
          published_at: string | null;
          tags: string[];
          payload: Json;
          updated_at: string;
        };
        Insert: {
          slug: string;
          title: string;
          description?: string | null;
          published_at?: string | null;
          tags?: string[];
          payload: Json;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          title?: string;
          description?: string | null;
          published_at?: string | null;
          tags?: string[];
          payload?: Json;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      r3p_summary: {
        Row: {
          id: number;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          id?: number;
          payload: Json;
          updated_at?: string;
        };
        Update: {
          id?: number;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      irbi_documents: {
        Row: {
          key: string;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          payload: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      data_documents: {
        Row: {
          key: string;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          payload: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          payload?: Json;
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
      weather_forecasts: {
        Row: {
          kabupaten_kota: string;
          adm4_code: string | null;
          payload: Json;
          source: string;
          fetched_at: string;
          expires_at: string;
          updated_at: string;
        };
        Insert: {
          kabupaten_kota: string;
          adm4_code?: string | null;
          payload: Json;
          source: string;
          fetched_at: string;
          expires_at: string;
          updated_at?: string;
        };
        Update: {
          kabupaten_kota?: string;
          adm4_code?: string | null;
          payload?: Json;
          source?: string;
          fetched_at?: string;
          expires_at?: string;
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
export type AdminProfileRow = Database["public"]["Tables"]["admin_profiles"]["Row"];
export type LiveStatsRow = Database["public"]["Tables"]["live_stats"]["Row"];
export type HazardStatusRow = Database["public"]["Tables"]["hazard_status"]["Row"];
export type MapLayerRow = Database["public"]["Tables"]["map_layers"]["Row"];
export type AreaFeatureMetaRow = Database["public"]["Tables"]["area_feature_meta"]["Row"];
export type KejadianBencanaRow = Database["public"]["Tables"]["kejadian_bencana"]["Row"];
export type MarkerFeatureRow = Database["public"]["Tables"]["marker_features"]["Row"];
export type AnggaranAnalisisRow = Database["public"]["Tables"]["anggaran_analisis"]["Row"];
export type AnggaranKegiatanRow = Database["public"]["Tables"]["anggaran_kegiatan"]["Row"];
export type PublikasiMetaRow = Database["public"]["Tables"]["publikasi_meta"]["Row"];
export type PublikasiRow = Database["public"]["Tables"]["publikasi"]["Row"];
export type R3PSummaryRow = Database["public"]["Tables"]["r3p_summary"]["Row"];
export type IrbiDocumentRow = Database["public"]["Tables"]["irbi_documents"]["Row"];
export type DataDocumentRow = Database["public"]["Tables"]["data_documents"]["Row"];
export type WeatherForecastRow = Database["public"]["Tables"]["weather_forecasts"]["Row"];
export type ProfilDesaRow = Database["public"]["Tables"]["profil_desa"]["Row"];
