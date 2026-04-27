import { notFound } from "next/navigation";
import { requireAuth } from "../../_lib/require-auth";
import { getCategories, getRestaurant } from "../../_lib/queries";
import { categoryToMl } from "../../_v2/mappers";
import type { ApiCategory } from "../../_v2/api";
import { NewItemClient } from "./new-client";
import { getMlWithFallback } from "../../_v2/i18n";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string }>;
}) {
  const { categoryId } = await searchParams;
  if (!categoryId) notFound();
  const companyId = await requireAuth();
  const [restaurant, categories] = await Promise.all([
    getRestaurant(companyId),
    getCategories(companyId),
  ]);
  const defaultLang = restaurant?.defaultLanguage || "en";
  const apiCategory = (categories as unknown as ApiCategory[]).find((c) => c.id === categoryId);
  if (!apiCategory) notFound();
  const categoryName = getMlWithFallback(categoryToMl(apiCategory, defaultLang), defaultLang, defaultLang);
  return <NewItemClient categoryId={categoryId} categoryName={categoryName} />;
}
