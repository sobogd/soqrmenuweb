import { requireAuth } from "./_lib/require-auth";
import { getCategories, getItems, getRestaurant } from "./_lib/queries";
import { MenuList } from "./_v2/menu-list";
import { buildCategories } from "./_v2/mappers";
import type { ApiCategory, ApiItem } from "./_v2/api";

export default async function MenuPage() {
 const companyId = await requireAuth();
 const [restaurant, categories, items] = await Promise.all([
 getRestaurant(companyId),
 getCategories(companyId),
 getItems(companyId),
 ]);
 const defaultLang = restaurant?.defaultLanguage || "en";
 const built = buildCategories(
 categories as unknown as ApiCategory[],
 items as unknown as ApiItem[],
 defaultLang,
 );
 return <MenuList initialCategories={built} />;
}
