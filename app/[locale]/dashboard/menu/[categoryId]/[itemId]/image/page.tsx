import { requireAuth } from "../../../../_lib/require-auth";
import { MenuItemImagePage } from "../../../../_pages/menu-item-image";

export default async function Page({ params }: { params: Promise<{ categoryId: string; itemId: string }> }) {
  await requireAuth();
  const { categoryId, itemId } = await params;

  return <MenuItemImagePage categoryId={categoryId} itemId={itemId} />;
}
