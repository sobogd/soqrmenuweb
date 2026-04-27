import { requireAuth } from "../_lib/require-auth";
import { getCategories, getItems, getOrders, getRestaurant, getTables } from "../_lib/queries";
import { KitchenClient } from "./kitchen-client";
import { apiOrderToOrder, apiTableToTable, buildCategories } from "../_v2/mappers";
import type { ApiCategory, ApiItem, ApiOrder, ApiTable } from "../_v2/api";

export default async function KitchenPageRoute() {
  const companyId = await requireAuth();
  const [restaurant, categories, items, tables, orders] = await Promise.all([
    getRestaurant(companyId),
    getCategories(companyId),
    getItems(companyId),
    getTables(companyId),
    getOrders(companyId),
  ]);
  const defaultLang = restaurant?.defaultLanguage || "en";
  const apiTables = tables as unknown as ApiTable[];
  const tablesByNumber = new Map(apiTables.map((t) => [t.number, t.id]));
  const initialOrders = (orders as unknown as ApiOrder[]).map((o) => apiOrderToOrder(o, tablesByNumber));
  const initialTables = apiTables.map(apiTableToTable);
  const initialCategories = buildCategories(
    categories as unknown as ApiCategory[],
    items as unknown as ApiItem[],
    defaultLang,
  );
  return (
    <KitchenClient
      initialOrders={initialOrders}
      initialTables={initialTables}
      initialCategories={initialCategories}
    />
  );
}
