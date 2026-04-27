import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserCompanyId } from "@/lib/auth";

/**
 * POST /api/orders
 * Manager-side order creation (started from the dashboard, e.g. waiter at a table).
 * Independent of `Restaurant.ordersEnabled` — that flag only gates customer-facing
 * public-menu order intake.
 *
 * Body: { tableNumber?: number; items?: unknown[]; total?: number; customerName?: string }
 * Items default to []; total to 0; status to "in_progress".
 */
export async function POST(request: NextRequest) {
  try {
    const companyId = await getUserCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { companyId },
      select: { id: true, currency: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const tableNumber =
      typeof body.tableNumber === "number" && Number.isFinite(body.tableNumber)
        ? body.tableNumber
        : null;
    const items = Array.isArray(body.items) ? (body.items as unknown[]) : [];
    const total = typeof body.total === "number" && Number.isFinite(body.total) ? body.total : 0;
    const customerName =
      typeof body.customerName === "string" && body.customerName.trim().length > 0
        ? body.customerName.trim()
        : null;

    const order = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        companyId,
        items: items as Prisma.InputJsonValue,
        total,
        currency: restaurant.currency,
        customerName,
        tableNumber,
        status: "in_progress",
      },
    });

    return NextResponse.json(
      {
        ...order,
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

/**
 * GET /api/orders
 * List orders for the authenticated company.
 * Query params: ?status= (optional filter)
 */
export async function GET(request: NextRequest) {
  try {
    const companyId = await getUserCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: { companyId: string; status?: string } = { companyId };
    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const serialized = orders.map((o) => ({
      ...o,
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
