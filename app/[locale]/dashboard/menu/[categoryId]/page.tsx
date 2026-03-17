import { requireAuth } from "../../_lib/require-auth";
import { getCategories, getItems, getRestaurant } from "../../_lib/queries";
import { MenuCategoryPage } from "../../_pages/menu-category";
import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ categoryId: string }> }) {
  const companyId = await requireAuth();
  const { categoryId } = await params;

  const [categories, items, restaurant] = await Promise.all([
    getCategories(companyId),
    getItems(companyId),
    getRestaurant(companyId),
  ]);

  const category = categories.find((c) => c.id === categoryId);
  if (!category) {
    redirect("/dashboard/menu");
  }

  const categoryItems = items.filter((i) => i.categoryId === categoryId);

  return (
    <MenuCategoryPage
      categoryId={categoryId}
      categoryName={category.name}
      initialItems={categoryItems}
      currency={restaurant?.currency ?? "EUR"}
    />
  );
}
