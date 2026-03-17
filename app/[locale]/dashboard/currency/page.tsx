import { requireAuth } from "../_lib/require-auth";
import { getRestaurant } from "../_lib/queries";
import { CurrencyPage } from "../_pages/currency";

export default async function Page() {
  const companyId = await requireAuth();
  const restaurant = await getRestaurant(companyId);

  return <CurrencyPage initialCurrency={restaurant?.currency ?? "EUR"} />;
}
