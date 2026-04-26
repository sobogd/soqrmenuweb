import { NextResponse } from "next/server";
import { getUserCompanyId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const companyId = await getUserCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.company.update({
      where: { id: companyId },
      data: { onboardingStep: 3 },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }
}
