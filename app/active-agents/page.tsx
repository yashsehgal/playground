import type { Metadata } from "next";
import { ActiveAgents } from "@/components/active-agents";
import { ShaderBackground } from "@/components/shader-background";

export const metadata: Metadata = {
  title: "Active agents",
};

const groups = [
  {
    id: "today",
    label: "Today",
    agents: [
      {
        id: "search",
        title: "Index search documents",
        branch: "feat/search-index",
        added: 63,
        removed: 9,
        status: "running" as const,
      },
      {
        id: "session",
        title: "Tighten session expiry",
        branch: "fix/session-expiry",
        added: 22,
        removed: 15,
        status: "done" as const,
      },
    ],
  },
  {
    id: "week",
    label: "This week",
    agents: [
      {
        id: "billing",
        title: "Migrate billing to Stripe",
        branch: "feat/stripe-billing",
        added: 186,
        removed: 42,
        status: "running" as const,
      },
      {
        id: "auth",
        title: "Fix auth redirect loop",
        branch: "fix/auth-redirect",
        added: 28,
        removed: 11,
        status: "running" as const,
      },
      {
        id: "export",
        title: "Add usage CSV export",
        branch: "feat/usage-export",
        added: 94,
        removed: 6,
        status: "done" as const,
      },
      {
        id: "webhooks",
        title: "Retry failed webhooks",
        branch: "fix/webhook-retries",
        added: 41,
        removed: 17,
        status: "running" as const,
      },
    ],
  },
];

export default function ActiveAgentsPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="relative flex aspect-square w-full max-w-[34rem] items-center justify-center rounded-sm p-12 sm:p-16">
        <div className="absolute inset-0 overflow-hidden rounded-sm">
          <ShaderBackground className="absolute inset-0" />
        </div>
        <div className="relative flex w-full justify-center">
          <ActiveAgents groups={groups} />
        </div>
      </div>
    </main>
  );
}
