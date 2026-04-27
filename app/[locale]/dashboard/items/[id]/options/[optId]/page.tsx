import { notFound } from "next/navigation";
import { requireAuth } from "../../../../_lib/require-auth";
import { getCategories, getItems, getRestaurant } from "../../../../_lib/queries";
import { apiCategoryToCategory } from "../../../../_v2/mappers";
import type { ApiCategory, ApiItem } from "../../../../_v2/api";
import { OptionEditClient } from "./edit-client";

export default async function EditOptionPage({
 params,
}: {
 params: Promise<{ id: string; optId: string }>;
}) {
 const { id, optId } = await params;
 const companyId = await requireAuth();
 const [restaurant, categories, items] = await Promise.all([
 getRestaurant(companyId),
 getCategories(companyId),
 getItems(companyId),
 ]);
 const defaultLang = restaurant?.defaultLanguage || "en";
 const apiItems = items as unknown as ApiItem[];
 const item = apiItems.find((i) => i.id === id);
 if (!item) notFound();
 const apiCategory = (categories as unknown as ApiCategory[]).find((c) => c.id === item.categoryId);
 if (!apiCategory) notFound();
 const category = apiCategoryToCategory(apiCategory, apiItems, defaultLang);
 const dish = category.dishes.find((d) => d.id === id);
 if (!dish) notFound();
 const option = dish.options.find((o) => o.id === optId);
 if (!option) notFound();

 return <OptionEditClient dish={dish} option={option} />;
}
