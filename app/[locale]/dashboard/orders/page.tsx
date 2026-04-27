import { requireAuth } from "../_lib/require-auth";
import { getCategories, getItems, getOrders, getRestaurant, getTables } from "../_lib/queries";
import { OrdersClient } from "./orders-client";
import { apiOrderToOrder, apiTableToTable, buildCategories } from "../_v2/mappers";
import type { ApiCategory, ApiItem, ApiOrder, ApiTable } from "../_v2/api";

export default async function OrdersPageRoute() {
  const companyId = await requireAuth();
  const [restaurant, orders, tables, categories, items] = await Promise.all([
    getRestaurant(companyId),
    getOrders(companyId),
    getTables(companyId),
    getCategories(companyId),
    getItems(companyId),
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
    <OrdersClient
      initialOrders={initialOrders}
      initialTables={initialTables}
      initialCategories={initialCategories}
    />
  );
}
