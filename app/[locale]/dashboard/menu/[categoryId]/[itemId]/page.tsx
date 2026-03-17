import { requireAuth } from "../../../_lib/require-auth";
import { MenuItemFormPage } from "../../../_pages/menu-item-form";

export default async function Page({ params }: { params: Promise<{ categoryId: string; itemId: string }> }) {
  await requireAuth();
  const { categoryId, itemId } = await params;

  return <MenuItemFormPage id={itemId} categoryId={categoryId} />;
}
