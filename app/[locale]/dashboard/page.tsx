import { requireAuth } from "./_lib/require-auth";
import { getItems, getCategories, getRestaurant, checkIsAdmin } from "./_lib/queries";
import { HubPage } from "./_pages/hub";

export default async function Page() {
  const companyId = await requireAuth();

  const [items, categories, restaurant, isAdmin] = await Promise.all([
    getItems(companyId),
    getCategories(companyId),
    getRestaurant(companyId),
    checkIsAdmin(),
  ]);

  return (
    <HubPage
      initialItems={items}
      initialCategories={categories}
      initialCurrency={restaurant?.currency ?? "EUR"}
      restaurantName={restaurant?.title ?? ""}
      slug={restaurant?.slug ?? null}
      isAdmin={isAdmin}
    />
  );
}
