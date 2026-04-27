import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/admin";
import { AdminPage } from "../../../_pages/admin";

export default async function Page() {
 const cookieStore = await cookies();
 const email = cookieStore.get("user_email")?.value;
 if (!isAdminEmail(email)) notFound();

 return (
 <Suspense fallback={null}>
 <AdminPage />
 </Suspense>
 );
}
