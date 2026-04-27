import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserCompanyId } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

export async function GET() {
  const companyId = await getUserCompanyId();
  const cookieStore = await cookies();
  const email = cookieStore.get("user_email")?.value;
  return NextResponse.json({
    authenticated: !!companyId,
    isAdmin: isAdminEmail(email),
  });
}
