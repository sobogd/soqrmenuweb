import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserCompanyId } from "@/lib/auth";
import { Prisma } from "@prisma/client";

/**
 * PATCH /api/orders/[id]
 * Update order status, items array, and/or total.
 * Body: { status?: string; items?: unknown[]; total?: number }
 *
 * Items are stored as JSON; the dashboard extends each entry with a per-item kitchen
 * status (`pending` | `cooking` | `ready` | `served`). The API doesn't validate the
 * shape of items beyond it being an array — that's a client-side concern.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getUserCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const order = await prisma.order.findFirst({
      where: { id, companyId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const data: Prisma.OrderUpdateInput = {};

    if (body.status !== undefined) {
      const validStatuses = ["new", "in_progress", "completed", "cancelled"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = body.status;
    }

    if (body.items !== undefined) {
      if (!Array.isArray(body.items)) {
        return NextResponse.json({ error: "items must be an array" }, { status: 400 });
      }
      data.items = body.items as Prisma.InputJsonValue;
    }

    if (body.total !== undefined) {
      const t = Number(body.total);
      if (isNaN(t)) {
        return NextResponse.json({ error: "Invalid total" }, { status: 400 });
      }
      data.total = t;
    }

    const updated = await prisma.order.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ...updated,
      total: Number(updated.total),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
