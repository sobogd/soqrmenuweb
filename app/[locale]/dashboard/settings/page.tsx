import Link from "next/link";
import { ChevronRightIcon } from "../_v2/icons";
import { PageHeader } from "../_v2/ui";
import { LogoutLink } from "./logout-link";

const CARDS: { href: string; title: string; desc: string }[] = [
  { href: "/dashboard/settings/about", title: "About", desc: "Title, subtitle, visibility" },
  { href: "/dashboard/settings/contacts", title: "Contacts & location", desc: "Phone, social, address" },
  { href: "/dashboard/settings/branding", title: "Branding", desc: "Background, accent color" },
  { href: "/dashboard/settings/general", title: "General", desc: "Menu link, currency" },
  { href: "/dashboard/settings/tables", title: "Tables", desc: "Floor plan and capacity" },
  { href: "/dashboard/settings/orders", title: "Orders", desc: "Accept orders, modes, required fields" },
  { href: "/dashboard/settings/bookings", title: "Bookings", desc: "Confirmation mode, duration, hours" },
  { href: "/dashboard/settings/languages", title: "Languages", desc: "Menu translation languages" },
  { href: "/dashboard/settings/billing", title: "Billing", desc: "Subscription and invoices" },
  { href: "/dashboard/settings/support", title: "Support", desc: "Chat with our team" },
];

export default function SettingsHubPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your restaurant, team, and account." />
      <div className="space-y-2.5">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="w-full text-left p-4 bg-card border border-border rounded-xl hover:border-input transition-colors flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">{card.title}</div>
              <div className="text-xs text-muted-foreground leading-snug mt-0.5">{card.desc}</div>
            </div>
            <ChevronRightIcon size={16} className="text-muted-foreground shrink-0" />
          </Link>
        ))}
        <LogoutLink />
      </div>
    </div>
  );
}
