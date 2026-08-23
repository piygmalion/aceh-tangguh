import { redirect } from "next/navigation";

/** Locale-less `/` — next-intl middleware handles this on the Node host. */
export default function RootPage() {
  redirect("/id");
}
