import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/admin";
import { AdminCompanyPage } from "../../../../_pages/admin-company";

export default async function Page({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const cookieStore = await cookies();
 const email = cookieStore.get("user_email")?.value;
 if (!isAdminEmail(email)) notFound();

 const { id } = await params;
 return <AdminCompanyPage companyId={id} />;
}
