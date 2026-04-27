import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getUserWithCompany } from "@/lib/auth";
import { isAnonymousEmail } from "@/lib/anonymous";
import { generateUniqueSlug } from "@/lib/slug";
import { getPublicUrl, s3Key } from "@/lib/s3";
import { getCoordinatesByCountry, COUNTRY_CENTERS } from "@/lib/country-centers";
import type { Locale } from "@/i18n/routing";
import { DashboardChrome } from "./_v2/chrome";
import { apiRestaurantToRestaurant } from "./_v2/mappers";
import type { ApiRestaurant } from "./_v2/api";

// Server component: enforce auth + ensure Restaurant row, then render the client chrome
// (top + bottom nav, restaurant context) around child routes.

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getUserWithCompany();

  if (!auth) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const companyId = auth.companyId;

  let restaurant = await prisma.restaurant.findFirst({ where: { companyId } });

  if (!restaurant) {
    const cookieStore = await cookies();
    const currentEmailForCheck = cookieStore.get("user_email")?.value;
    const isAnonCheck = currentEmailForCheck ? isAnonymousEmail(currentEmailForCheck) : false;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { onboardingStep: true },
    });

    if (!isAnonCheck && company && company.onboardingStep < 3) {
      const locale = await getLocale();
      redirect(`/${locale}/onboarding`);
    }

    const userLocale = (await getLocale()) as Locale;
    const currency = cookieStore.get("currency")?.value || "EUR";
    const geoCountry = cookieStore.get("geo_country")?.value || null;
    const countryCoords = getCoordinatesByCountry(geoCountry);
    const center = countryCoords || COUNTRY_CENTERS[userLocale];
    const slug = await generateUniqueSlug(Math.random().toString(36).substring(2, 10));
    const initialBackground = getPublicUrl(s3Key("background_initial.webp"));

    restaurant = await prisma.$transaction(async (tx) => {
      const created = await tx.restaurant.create({
        data: {
          title: "",
          slug,
          currency,
          source: initialBackground,
          accentColor: "#000000",
          languages: [userLocale],
          defaultLanguage: userLocale,
          x: center?.lng?.toString() || null,
          y: center?.lat?.toString() || null,
          companyId,
          startedFromScratch: true,
        },
      });
      await tx.category.create({
        data: {
          name: "General",
          sortOrder: 0,
          companyId,
        },
      });
      return created;
    });
  }

  // Serialize Decimal/Date for the client boundary.
  const apiRestaurant: ApiRestaurant = {
    ...restaurant,
    languages: restaurant.languages,
  };
  const uiRestaurant = apiRestaurantToRestaurant(apiRestaurant);

  return <DashboardChrome restaurant={uiRestaurant}>{children}</DashboardChrome>;
}
