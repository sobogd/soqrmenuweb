import { EmptyState, PageHeader } from "../_v2/ui";

export default function AnalyticsPageRoute() {
  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Analytics" subtitle="Views, conversions, and top dishes will appear here." />
      <EmptyState
        title="No data yet"
        subtitle="Once guests start scanning your menu, you'll see traffic and engagement metrics here."
      />
    </div>
  );
}
