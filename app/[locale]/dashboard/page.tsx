import { requireAuth } from "./_lib/require-auth";
import { getCategories, getItems, getRestaurant, getSubscriptionStatus } from "./_lib/queries";
import { MenuList } from "./_v2/menu-list";
import { buildCategories } from "./_v2/mappers";
import type { ApiCategory, ApiItem } from "./_v2/api";

export default async function MenuPage() {
 const companyId = await requireAuth();
 const [restaurant, categories, items, sub] = await Promise.all([
 getRestaurant(companyId),
 getCategories(companyId),
 getItems(companyId),
 getSubscriptionStatus(companyId),
 ]);
 const defaultLang = restaurant?.defaultLanguage || "en";
 const built = buildCategories(
 categories as unknown as ApiCategory[],
 items as unknown as ApiItem[],
 defaultLang,
 );
 const initialSub = sub
 ? { plan: sub.plan, subscriptionStatus: sub.subscriptionStatus, trialEndsAt: sub.trialEndsAt }
 : null;
 return <MenuList initialCategories={built} initialSub={initialSub} />;
}
