"use client";

import { useState } from "react";
import { ChevronRightIcon } from "../_v2/icons";
import { logout } from "../_v2/api";

export function LogoutLink() {
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
      window.location.href = "/login";
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className="w-full text-left p-4 bg-card border border-border rounded-xl hover:border-red-300 transition-colors flex items-center justify-between gap-3 disabled:opacity-60"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-red-600">{busy ? "Logging out..." : "Log out"}</div>
        <div className="text-xs text-muted-foreground leading-snug mt-0.5">Sign out of this account.</div>
      </div>
      <ChevronRightIcon size={16} className="text-muted-foreground shrink-0" />
    </button>
  );
}
