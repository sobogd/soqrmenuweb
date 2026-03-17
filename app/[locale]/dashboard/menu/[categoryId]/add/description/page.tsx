import { requireAuth } from "../../../../_lib/require-auth";
import { MenuItemDescriptionPage } from "../../../../_pages/menu-item-description";

export default async function Page({ params }: { params: Promise<{ categoryId: string }> }) {
  await requireAuth();
  const { categoryId } = await params;

  return <MenuItemDescriptionPage categoryId={categoryId} />;
}
