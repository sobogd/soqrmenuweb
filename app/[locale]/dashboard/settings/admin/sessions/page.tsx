import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/admin";
import { SessionsPage } from "../../../_pages/sessions";

export default async function Page() {
 const cookieStore = await cookies();
 const email = cookieStore.get("user_email")?.value;
 if (!isAdminEmail(email)) notFound();

 return (
 <Suspense fallback={null}>
 <SessionsPage />
 </Suspense>
 );
}
