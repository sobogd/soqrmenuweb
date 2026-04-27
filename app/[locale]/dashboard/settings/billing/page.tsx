"use client";

import { useRouter } from "next/navigation";
import { BillingSettingsPage } from "../../_v2/settings";

export default function Page() {
  const router = useRouter();
  return <BillingSettingsPage onBack={() => router.push("/dashboard/settings")} />;
}
