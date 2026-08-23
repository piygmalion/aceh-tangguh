import formDefinitions from "@/data/laporan/form_definitions.json";

export type JenisBencana = "banjir" | "longsor" | "gempa" | "tsunami" | "gunung_meletus";

export type FormOption = {
  value: string;
  label: string;
  bobot?: number;
};

export type FormFieldDef = {
  field_key: string;
  label: string;
  tipe_input: string;
  wajib?: boolean;
  urutan?: number;
  opsi?: FormOption[];
  validasi?: Record<string, unknown>;
  catatan?: string;
};

export type FormDefinitions = typeof formDefinitions;

export function getFormDefinitions(): FormDefinitions {
  return formDefinitions;
}

export function getKejadianJenisList() {
  return formDefinitions.kejadian.jenis;
}

export function getKejadianFields(jenis: JenisBencana): FormFieldDef[] {
  const shared = [
    ...formDefinitions.shared_demografi.fields,
    ...(jenis === "tsunami"
      ? formDefinitions.kejadian.fields_by_jenis.tsunami.filter((f) => f.field_key === "ada_korban")
      : formDefinitions.shared_korban.fields),
    ...formDefinitions.kejadian.fields_by_jenis[jenis],
    ...formDefinitions.shared_infrastruktur.fields,
    ...formDefinitions.shared_penutup.fields,
  ];
  return shared.sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
}

export function getPenangananFields(): FormFieldDef[] {
  return [
    ...formDefinitions.shared_demografi.fields,
    ...formDefinitions.penanganan.fields,
    ...formDefinitions.shared_penutup.fields,
  ].sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
}

export const ACEH_BOUNDS = {
  latMin: 1.5,
  latMax: 6.5,
  lonMin: 95.0,
  lonMax: 98.5,
};

export function inAcehBounds(lat: number, lon: number): boolean {
  return (
    lat >= ACEH_BOUNDS.latMin &&
    lat <= ACEH_BOUNDS.latMax &&
    lon >= ACEH_BOUNDS.lonMin &&
    lon <= ACEH_BOUNDS.lonMax
  );
}
