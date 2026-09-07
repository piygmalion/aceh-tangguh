/** Lightweight Database types mirroring public tables in Aceh Tangguh Supabase. */

import type { SikTables } from "@/lib/sik/db-tables";
import type { Json as JsonValue } from "./json";

export type Json = JsonValue;

export type ReportTopic =
  | "banjir"
  | "longsor"
  | "hunian"
  | "perlindungan"
  | "logistik"
  | "kesehatan"
  | "lainnya";

export type ReportStatus = "queued" | "published" | "rejected";

export type AdminRole =
  | "super_admin"
  | "admin"
  | "admin_provinsi"
  | "admin_kabkota"
  | "admin_desa"
  | "penilai_pkd"
  | "admin_rr";

export type HazardKind =
  | "banjir"
  | "longsor"
  | "gempa"
  | "kebakaran"
  | "karhutla"
  | "puting_beliung"
  | "lainnya";
export type HazardSeverity = "low" | "med" | "high";

export type MapLayerKind = "area" | "marker" | "boundary" | "overlay";
export type MapLayerSourceType = "geojson" | "pmtiles" | "api" | "mixed";

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
          kode_kabupaten: string | null;
          kabupaten: string | null;
          kode_kecamatan: string | null;
          kecamatan: string | null;
          kode_desa_kelurahan: string | null;
          desa: string | null;
        };
        Insert: {
          user_id: string;
          role: AdminRole;
          display_name?: string | null;
          created_at?: string;
          kode_kabupaten?: string | null;
          kabupaten?: string | null;
          kode_kecamatan?: string | null;
          kecamatan?: string | null;
          kode_desa_kelurahan?: string | null;
          desa?: string | null;
        };
        Update: {
          user_id?: string;
          role?: AdminRole;
          display_name?: string | null;
          created_at?: string;
          kode_kabupaten?: string | null;
          kabupaten?: string | null;
          kode_kecamatan?: string | null;
          kecamatan?: string | null;
          kode_desa_kelurahan?: string | null;
          desa?: string | null;
        };
        Relationships: EmptyRelationships;
      };
      admin_role_modules: {
        Row: {
          role: AdminRole;
          module: string;
          allowed: boolean;
        };
        Insert: {
          role: AdminRole;
          module: string;
          allowed?: boolean;
        };
        Update: {
          role?: AdminRole;
          module?: string;
          allowed?: boolean;
        };
        Relationships: EmptyRelationships;
      };
      live_stats: {
        Row: {
          id: number;
          active_incidents: number;
          posko_count: number | null;
          reports_last_24h: number;
          updated_at: string;
        };
        Insert: {
          id?: number;
          active_incidents?: number;
          posko_count?: number | null;
          reports_last_24h?: number;
          updated_at?: string;
        };
        Update: {
          id?: number;
          active_incidents?: number;
          posko_count?: number | null;
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
          kejadian_id: string | null;
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
          kejadian_id?: string | null;
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
          kejadian_id?: string | null;
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
      publikasi_kegiatan: {
        Row: {
          id: string;
          slug: string | null;
          judul: string;
          ringkasan: string | null;
          tanggal_publikasi: string | null;
          penulis: string | null;
          kategori: string | null;
          jenis_kegiatan: string | null;
          jenis_bencana: string | null;
          fase: string | null;
          lokasi_teks: string | null;
          url: string | null;
          foto_sampul_url: string | null;
          foto_sampul_thumbnail_url: string | null;
          jumlah_foto: number | null;
          kabupaten: Json | null;
          photos: Json | null;
          sumber: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          slug?: string | null;
          judul: string;
          ringkasan?: string | null;
          tanggal_publikasi?: string | null;
          penulis?: string | null;
          kategori?: string | null;
          jenis_kegiatan?: string | null;
          jenis_bencana?: string | null;
          fase?: string | null;
          lokasi_teks?: string | null;
          url?: string | null;
          foto_sampul_url?: string | null;
          foto_sampul_thumbnail_url?: string | null;
          jumlah_foto?: number | null;
          kabupaten?: Json;
          photos?: Json;
          sumber?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string | null;
          judul?: string;
          ringkasan?: string | null;
          tanggal_publikasi?: string | null;
          penulis?: string | null;
          kategori?: string | null;
          jenis_kegiatan?: string | null;
          jenis_bencana?: string | null;
          fase?: string | null;
          lokasi_teks?: string | null;
          url?: string | null;
          foto_sampul_url?: string | null;
          foto_sampul_thumbnail_url?: string | null;
          jumlah_foto?: number | null;
          kabupaten?: Json;
          photos?: Json;
          sumber?: string | null;
          updated_at?: string | null;
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
          kk_laki_laki: number | null;
          kk_perempuan: number | null;
          bayi_0_1: number | null;
          balita_1_4: number | null;
          anak_5_12: number | null;
          remaja_13_17: number | null;
          dewasa_18_59: number | null;
          lansia_60_plus: number | null;
          penyandang_disabilitas: number | null;
          kk_terdampak: number | null;
          populasi_terdampak: number | null;
          korban_meninggal: number | null;
          korban_hilang: number | null;
          rumah_rr: number | null;
          rumah_rs: number | null;
          rumah_rb: number | null;
          total_rumah_rusak: number | null;
          payload: Json | null;
          destana_level: string | null;
          destana_indeks: number | null;
          destana_tahun: number | null;
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
          kk_laki_laki?: number | null;
          kk_perempuan?: number | null;
          bayi_0_1?: number | null;
          balita_1_4?: number | null;
          anak_5_12?: number | null;
          remaja_13_17?: number | null;
          dewasa_18_59?: number | null;
          lansia_60_plus?: number | null;
          penyandang_disabilitas?: number | null;
          kk_terdampak?: number | null;
          populasi_terdampak?: number | null;
          korban_meninggal?: number | null;
          korban_hilang?: number | null;
          rumah_rr?: number | null;
          rumah_rs?: number | null;
          rumah_rb?: number | null;
          total_rumah_rusak?: number | null;
          payload?: Json | null;
          destana_level?: string | null;
          destana_indeks?: number | null;
          destana_tahun?: number | null;
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
          kk_laki_laki?: number | null;
          kk_perempuan?: number | null;
          bayi_0_1?: number | null;
          balita_1_4?: number | null;
          anak_5_12?: number | null;
          remaja_13_17?: number | null;
          dewasa_18_59?: number | null;
          lansia_60_plus?: number | null;
          penyandang_disabilitas?: number | null;
          kk_terdampak?: number | null;
          populasi_terdampak?: number | null;
          korban_meninggal?: number | null;
          korban_hilang?: number | null;
          rumah_rr?: number | null;
          rumah_rs?: number | null;
          rumah_rb?: number | null;
          total_rumah_rusak?: number | null;
          payload?: Json | null;
          destana_level?: string | null;
          destana_indeks?: number | null;
          destana_tahun?: number | null;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      krb_jenis_bahaya: {
        Row: {
          kode: string;
          label_id: string;
          label_en: string | null;
          kategori: string;
          sumber_otoritatif: string | null;
          updated_at: string;
        };
        Insert: {
          kode: string;
          label_id: string;
          label_en?: string | null;
          kategori: string;
          sumber_otoritatif?: string | null;
          updated_at?: string;
        };
        Update: {
          kode?: string;
          label_id?: string;
          label_en?: string | null;
          kategori?: string;
          sumber_otoritatif?: string | null;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      krb_kabupaten: {
        Row: {
          kode_kabupaten: string;
          kabupaten: string;
          is_kota: boolean;
          irb_2025: number | null;
          kelas_risiko_2025: string | null;
          irb_2024: number | null;
          ancaman_tertinggi: string | null;
          skor_ancaman_tertinggi: number | null;
          kelas_ancaman_tertinggi: string | null;
          jumlah_ancaman_tinggi: number;
          ancaman_tinggi: string[];
          latitude: number | null;
          longitude: number | null;
          sumber: string | null;
          updated_at: string;
        };
        Insert: {
          kode_kabupaten: string;
          kabupaten: string;
          is_kota?: boolean;
          irb_2025?: number | null;
          kelas_risiko_2025?: string | null;
          irb_2024?: number | null;
          ancaman_tertinggi?: string | null;
          skor_ancaman_tertinggi?: number | null;
          kelas_ancaman_tertinggi?: string | null;
          jumlah_ancaman_tinggi?: number;
          ancaman_tinggi?: string[];
          latitude?: number | null;
          longitude?: number | null;
          sumber?: string | null;
          updated_at?: string;
        };
        Update: {
          kode_kabupaten?: string;
          kabupaten?: string;
          is_kota?: boolean;
          irb_2025?: number | null;
          kelas_risiko_2025?: string | null;
          irb_2024?: number | null;
          ancaman_tertinggi?: string | null;
          skor_ancaman_tertinggi?: number | null;
          kelas_ancaman_tertinggi?: string | null;
          jumlah_ancaman_tinggi?: number;
          ancaman_tinggi?: string[];
          latitude?: number | null;
          longitude?: number | null;
          sumber?: string | null;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      krb_wilayah: {
        Row: {
          id: string;
          kode_kabupaten: string;
          kabupaten: string;
          jenis_bahaya: string;
          kelas_ancaman: string;
          skor_irbi: number | null;
          tahun_acuan: number;
          sumber: string | null;
          sumber_url: string | null;
          latitude: number | null;
          longitude: number | null;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          id: string;
          kode_kabupaten: string;
          kabupaten: string;
          jenis_bahaya: string;
          kelas_ancaman: string;
          skor_irbi?: number | null;
          tahun_acuan?: number;
          sumber?: string | null;
          sumber_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          payload?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kode_kabupaten?: string;
          kabupaten?: string;
          jenis_bahaya?: string;
          kelas_ancaman?: string;
          skor_irbi?: number | null;
          tahun_acuan?: number;
          sumber?: string | null;
          sumber_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      krb_kawasan: {
        Row: {
          id: string;
          nama: string;
          jenis_bahaya: string;
          zona: string;
          kabupaten: string[];
          kode_kabupaten: string[];
          deskripsi: string | null;
          potensi_bahaya: string | null;
          latitude: number | null;
          longitude: number | null;
          tahun_acuan: number | null;
          sumber: string | null;
          sumber_url: string | null;
          grain: string | null;
          catatan: string | null;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          id: string;
          nama: string;
          jenis_bahaya: string;
          zona: string;
          kabupaten?: string[];
          kode_kabupaten?: string[];
          deskripsi?: string | null;
          potensi_bahaya?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          tahun_acuan?: number | null;
          sumber?: string | null;
          sumber_url?: string | null;
          grain?: string | null;
          catatan?: string | null;
          payload?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nama?: string;
          jenis_bahaya?: string;
          zona?: string;
          kabupaten?: string[];
          kode_kabupaten?: string[];
          deskripsi?: string | null;
          potensi_bahaya?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          tahun_acuan?: number | null;
          sumber?: string | null;
          sumber_url?: string | null;
          grain?: string | null;
          catatan?: string | null;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      krb_dokumen: {
        Row: {
          id: string;
          judul: string;
          jenis: string;
          wilayah: string | null;
          kabupaten: string | null;
          tahun_mulai: number | null;
          tahun_akhir: number | null;
          penerbit: string | null;
          status: string | null;
          url: string | null;
          catatan: string | null;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          id: string;
          judul: string;
          jenis: string;
          wilayah?: string | null;
          kabupaten?: string | null;
          tahun_mulai?: number | null;
          tahun_akhir?: number | null;
          penerbit?: string | null;
          status?: string | null;
          url?: string | null;
          catatan?: string | null;
          payload?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          judul?: string;
          jenis?: string;
          wilayah?: string | null;
          kabupaten?: string | null;
          tahun_mulai?: number | null;
          tahun_akhir?: number | null;
          penerbit?: string | null;
          status?: string | null;
          url?: string | null;
          catatan?: string | null;
          payload?: Json;
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
      overlay_live_features: {
        Row: {
          id: string;
          layer_key: string;
          source: "bmkg" | "magma" | "sipongi" | "tatonas";
          external_id: string;
          longitude: number;
          latitude: number;
          occurred_at: string | null;
          properties: Json;
          created_at: string;
          updated_at: string;
          expires_at: string | null;
        };
        Insert: {
          id: string;
          layer_key: string;
          source: "bmkg" | "magma" | "sipongi" | "tatonas";
          external_id: string;
          longitude: number;
          latitude: number;
          occurred_at?: string | null;
          properties?: Json;
          created_at?: string;
          updated_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          layer_key?: string;
          source?: "bmkg" | "magma" | "sipongi" | "tatonas";
          external_id?: string;
          longitude?: number;
          latitude?: number;
          occurred_at?: string | null;
          properties?: Json;
          created_at?: string;
          updated_at?: string;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      overlay_static_features: {
        Row: {
          id: string;
          layer_key: string;
          external_id: string;
          name: string;
          kode_bmkg: string | null;
          longitude: number;
          latitude: number;
          source: string;
          source_url: string | null;
          properties: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          layer_key: string;
          external_id: string;
          name: string;
          kode_bmkg?: string | null;
          longitude: number;
          latitude: number;
          source?: string;
          source_url?: string | null;
          properties?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          layer_key?: string;
          external_id?: string;
          name?: string;
          kode_bmkg?: string | null;
          longitude?: number;
          latitude?: number;
          source?: string;
          source_url?: string | null;
          properties?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      overlay_live_refresh: {
        Row: {
          layer_key: string;
          refreshed_at: string;
          ok: boolean;
          feature_count: number;
          error: string | null;
        };
        Insert: {
          layer_key: string;
          refreshed_at: string;
          ok: boolean;
          feature_count: number;
          error?: string | null;
        };
        Update: {
          layer_key?: string;
          refreshed_at?: string;
          ok?: boolean;
          feature_count?: number;
          error?: string | null;
        };
        Relationships: EmptyRelationships;
      };
      maritime_forecast_cache: {
        Row: {
          kode: string;
          jenis: "perairan" | "pelabuhan";
          issued: string | null;
          valid_from: string | null;
          valid_to: string | null;
          payload: Json;
          fetched_at: string;
          expires_at: string | null;
        };
        Insert: {
          kode: string;
          jenis: "perairan" | "pelabuhan";
          issued?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
          payload?: Json;
          fetched_at?: string;
          expires_at?: string | null;
        };
        Update: {
          kode?: string;
          jenis?: "perairan" | "pelabuhan";
          issued?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
          payload?: Json;
          fetched_at?: string;
          expires_at?: string | null;
        };
        Relationships: EmptyRelationships;
      };
      panduan_faq: {
        Row: {
          id: string;
          pola: string;
          intent: string;
          body_id: string;
          body_en: string;
          href: string;
          hash: string | null;
          label_key: string;
          published: boolean;
          urutan: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pola: string;
          intent: string;
          body_id: string;
          body_en: string;
          href: string;
          hash?: string | null;
          label_key?: string;
          published?: boolean;
          urutan?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pola?: string;
          intent?: string;
          body_id?: string;
          body_en?: string;
          href?: string;
          hash?: string | null;
          label_key?: string;
          published?: boolean;
          urutan?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      panduan_unknown: {
        Row: {
          id: string;
          query_sanitized: string;
          locale: string;
          reason: string;
          pathname: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          query_sanitized: string;
          locale?: string;
          reason?: string;
          pathname?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          query_sanitized?: string;
          locale?: string;
          reason?: string;
          pathname?: string;
          created_at?: string;
        };
        Relationships: EmptyRelationships;
      };
    } & SikTables;
    Views: Record<string, never>;
    Functions: {
      next_laporan_nomor: {
        Args: { prefix: string };
        Returns: string;
      };
      next_kejadian_nomor: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_walidata: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
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
export type PublikasiKegiatanRow =
  Database["public"]["Tables"]["publikasi_kegiatan"]["Row"];
export type R3PSummaryRow = Database["public"]["Tables"]["r3p_summary"]["Row"];
export type IrbiDocumentRow = Database["public"]["Tables"]["irbi_documents"]["Row"];
export type DataDocumentRow = Database["public"]["Tables"]["data_documents"]["Row"];
export type WeatherForecastRow = Database["public"]["Tables"]["weather_forecasts"]["Row"];
export type ProfilDesaRow = Database["public"]["Tables"]["profil_desa"]["Row"];
export type KrbJenisBahayaRow = Database["public"]["Tables"]["krb_jenis_bahaya"]["Row"];
export type KrbKabupatenRow = Database["public"]["Tables"]["krb_kabupaten"]["Row"];
export type KrbWilayahRow = Database["public"]["Tables"]["krb_wilayah"]["Row"];
export type KrbKawasanRow = Database["public"]["Tables"]["krb_kawasan"]["Row"];
export type KrbDokumenRow = Database["public"]["Tables"]["krb_dokumen"]["Row"];
