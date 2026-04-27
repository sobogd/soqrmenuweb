import { notFound } from "next/navigation";
import { requireAuth } from "../../_lib/require-auth";
import { getCategories, getRestaurant } from "../../_lib/queries";
import { categoryToMl } from "../../_v2/mappers";
import type { ApiCategory } from "../../_v2/api";
import { EditCategoryClient } from "./edit-client";
import type { Category } from "../../_v2/types";

export default async function EditCategoryPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const companyId = await requireAuth();
 const [restaurant, categories] = await Promise.all([
 getRestaurant(companyId),
 getCategories(companyId),
 ]);
 const defaultLang = restaurant?.defaultLanguage || "en";
 const apiCategory = (categories as unknown as ApiCategory[]).find((c) => c.id === id);
 if (!apiCategory) notFound();

 const category: Category = {
 id: apiCategory.id,
 name: categoryToMl(apiCategory, defaultLang),
 sortOrder: apiCategory.sortOrder,
 dishes: [],
 };

 return <EditCategoryClient category={category} />;
}
