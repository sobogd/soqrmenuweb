import { requireAuth } from "../../../../_lib/require-auth";
import { MenuItemDescriptionPage } from "../../../../_pages/menu-item-description";

export default async function Page({ params }: { params: Promise<{ categoryId: string; itemId: string }> }) {
  await requireAuth();
  const { categoryId, itemId } = await params;

  return <MenuItemDescriptionPage categoryId={categoryId} itemId={itemId} />;
}
