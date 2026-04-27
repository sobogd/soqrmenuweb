"use client";

import { useRouter } from "next/navigation";
import { SupportPage } from "../../_v2/settings";

export default function Page() {
 const router = useRouter();
 return <SupportPage onBack={() => router.push("/dashboard/settings")} />;
}
