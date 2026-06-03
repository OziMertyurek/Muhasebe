import { redirect } from "next/navigation";

export default function KrediKartlariPage() {
  redirect("/accounts?type=CREDIT_CARD");
}
