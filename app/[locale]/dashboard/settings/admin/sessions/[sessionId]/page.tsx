import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/admin";
import { SessionDetailPage } from "../../../../_pages/session-detail";

export default async function Page({
 params,
}: {
 params: Promise<{ sessionId: string }>;
}) {
 const cookieStore = await cookies();
 const email = cookieStore.get("user_email")?.value;
 if (!isAdminEmail(email)) notFound();

 const { sessionId } = await params;
 return (
 <Suspense fallback={null}>
 <SessionDetailPage sessionId={sessionId} />
 </Suspense>
 );
}
