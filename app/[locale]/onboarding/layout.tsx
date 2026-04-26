import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashSessionToken, safeCompare } from "@/lib/session-utils";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  const userEmail = cookieStore.get("user_email");

  if (!session?.value || !userEmail?.value) {
    redirect(`/${locale}/login`);
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail.value },
    select: {
      sessionToken: true,
      companies: {
        include: { company: { select: { onboardingStep: true } } },
        take: 1,
      },
    },
  });

  const tokenHash = hashSessionToken(session.value);
  if (!user?.sessionToken || !safeCompare(user.sessionToken, tokenHash)) {
    redirect(`/${locale}/login`);
  }

  const onboardingStep = user.companies[0]?.company.onboardingStep ?? 0;

  if (onboardingStep >= 3) {
    redirect(`/${locale}/dashboard`);
  }

  return <>{children}</>;
}
