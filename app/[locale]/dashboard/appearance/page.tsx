import { requireAuth } from "../_lib/require-auth";
import { getRestaurant, getSubscriptionStatus } from "../_lib/queries";
import { AppearancePage } from "../_pages/appearance";

export default async function Page() {
  const companyId = await requireAuth();

  const [restaurant, subscription] = await Promise.all([
    getRestaurant(companyId),
    getSubscriptionStatus(companyId),
  ]);

  return (
    <AppearancePage
      initialRestaurant={
        restaurant
          ? {
              title: restaurant.title,
              description: restaurant.description,
              source: restaurant.source,
              accentColor: restaurant.accentColor,
              hideTitle: restaurant.hideTitle,
            }
          : null
      }
      plan={subscription?.plan ?? "FREE"}
    />
  );
}
