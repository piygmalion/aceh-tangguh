import { setRequestLocale } from "next-intl/server";
import { MapWorkspace } from "@/components/map/MapWorkspace";

export default async function PetaPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  return <MapWorkspace />;
}
