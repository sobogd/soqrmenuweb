import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCompany, getUserCompanyId } from "@/lib/auth";

// Period start in UTC. "today" anchors to the start of the current UTC day to
// stay consistent with Postgres `DATE()` (which is timezone-naive on a timestamp
// stored as UTC). This is good enough for now — restaurant-local time would need
// the company timezone in the schema.
function periodStart(period: string): Date {
  const now = new Date();
  if (period === "today") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

interface DayRow {
  day: string;
  views: bigint;
  scans: bigint;
}
interface LangRow {
  language: string;
  scans: bigint;
  views: bigint;
}
interface PageRow {
  page: string;
  views: bigint;
  sessions: bigint;
}

export async function GET(request: NextRequest) {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "7d";
  const start = periodStart(period);

  // Parallel queries — independent.
  const [
    totalViews,
    sessionList,
    returningSessions,
    byDay,
    byLanguage,
    byPage,
    monthlyScans,
    company,
  ] = await Promise.all([
    prisma.pageView.count({
      where: { companyId, createdAt: { gte: start } },
    }),
    prisma.pageView.groupBy({
      by: ["sessionId"],
      where: { companyId, createdAt: { gte: start } },
    }),
    // Sessions seen at least once before this period (returning).
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT "sessionId"
        FROM "page_views"
        WHERE "companyId" = ${companyId}
        GROUP BY "sessionId"
        HAVING MIN("createdAt") < ${start}
          AND MAX("createdAt") >= ${start}
      ) AS s
    `,
    prisma.$queryRaw<DayRow[]>`
      SELECT
        TO_CHAR("createdAt"::date, 'YYYY-MM-DD') AS day,
        COUNT(*)::bigint AS views,
        COUNT(DISTINCT "sessionId")::bigint AS scans
      FROM "page_views"
      WHERE "companyId" = ${companyId} AND "createdAt" >= ${start}
      GROUP BY day
      ORDER BY day ASC
    `,
    // Language counted on menu views only — that's the actually-used language.
    prisma.$queryRaw<LangRow[]>`
      SELECT
        language,
        COUNT(DISTINCT "sessionId")::bigint AS scans,
        COUNT(*)::bigint AS views
      FROM "page_views"
      WHERE "companyId" = ${companyId}
        AND "createdAt" >= ${start}
        AND page = 'menu'
      GROUP BY language
      ORDER BY scans DESC
    `,
    prisma.$queryRaw<PageRow[]>`
      SELECT
        page,
        COUNT(*)::bigint AS views,
        COUNT(DISTINCT "sessionId")::bigint AS sessions
      FROM "page_views"
      WHERE "companyId" = ${companyId} AND "createdAt" >= ${start}
      GROUP BY page
      ORDER BY views DESC
    `,
    // Current calendar month — distinct sessions = scans against limit.
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "sessionId")::bigint AS count
      FROM "page_views"
      WHERE "companyId" = ${companyId}
        AND "createdAt" >= DATE_TRUNC('month', NOW())
    `,
    getAuthCompany(),
  ]);

  const scans = sessionList.length;
  const avgPagesPerSession = scans > 0 ? totalViews / scans : 0;

  // Limit info.
  const { getCompanyAccess } = await import("@/lib/access");
  const accessCompany = company
    ? {
        plan: company.plan,
        subscriptionStatus: company.subscriptionStatus,
        trialEndsAt: company.trialEndsAt,
        scanLimit: company.scanLimit,
      }
    : null;
  const access = accessCompany ? getCompanyAccess(accessCompany) : null;
  const monthlyScansCount = Number(monthlyScans[0]?.count ?? 0);

  return NextResponse.json({
    period,
    rangeStart: start.toISOString(),
    totalScans: scans,
    totalViews,
    avgPagesPerSession: Number(avgPagesPerSession.toFixed(2)),
    returningScans: Number(returningSessions[0]?.count ?? 0),
    byDay: byDay.map((d) => ({
      day: d.day,
      views: Number(d.views),
      scans: Number(d.scans),
    })),
    byLanguage: byLanguage.map((l) => ({
      language: l.language,
      scans: Number(l.scans),
      views: Number(l.views),
    })),
    byPage: byPage.map((p) => ({
      page: p.page,
      views: Number(p.views),
      sessions: Number(p.sessions),
    })),
    monthlyScans: monthlyScansCount,
    plan: company?.plan ?? null,
    scanLimit: access?.hasScanLimit ? access.scanLimit : null,
  });
}
