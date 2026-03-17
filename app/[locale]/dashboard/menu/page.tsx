import { requireAuth } from "../_lib/require-auth";
import { getCategories, getItems } from "../_lib/queries";
import { MenuMakerPage } from "../_pages/menu-maker";

export default async function Page() {
  const companyId = await requireAuth();

  const [categories, items] = await Promise.all([
    getCategories(companyId),
    getItems(companyId),
  ]);

  const itemCounts: Record<string, number> = {};
  for (const item of items) {
    itemCounts[item.categoryId] = (itemCounts[item.categoryId] || 0) + 1;
  }

  const hasOnlyDemoItems = items.length === 0 || items.every((i) => i.isDemo);

  return (
    <MenuMakerPage
      initialCategories={categories}
      itemCounts={itemCounts}
      hasOnlyDemoItems={hasOnlyDemoItems}
    />
  );
}
