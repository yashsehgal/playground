import type { Metadata } from "next";
import { Issues } from "@/components/issues";
import { ShaderBackground } from "@/components/shader-background";

export const metadata: Metadata = {
  title: "Issues",
};

const agents = {
  peter: { id: "peter", name: "Peter", color: "oklch(0.8 0.06 250)" },
  mia: { id: "mia", name: "Mia", color: "oklch(0.82 0.06 165)" },
  adam: { id: "adam", name: "Adam", color: "oklch(0.84 0.06 85)" },
  nina: { id: "nina", name: "Nina", color: "oklch(0.8 0.05 320)" },
  leo: { id: "leo", name: "Leo", color: "oklch(0.8 0.06 45)" },
};

const issues = [
  {
    id: "startup",
    key: "ENG-2498",
    title: "Improve app startup metrics",
    priority: "high" as const,
    status: "progress" as const,
    assignees: [agents.peter, agents.mia],
    activity: "Peter and Mia are working on it",
  },
  {
    id: "regression",
    key: "ENG-2380",
    title: "Add startup regression alert",
    priority: "medium" as const,
    status: "progress" as const,
    pullRequest: 186,
    assignees: [agents.adam],
    activity: "Adam is preparing a doc",
  },
  {
    id: "position",
    key: "ENG-2039",
    title: "Smooth vehicle position updates during slow networks",
    priority: "none" as const,
    status: "todo" as const,
    assignees: [agents.nina],
    activity: "Nina is planning a doc",
  },
  {
    id: "eta",
    key: "ENG-2076",
    title: "Reduce ETA jitter",
    priority: "high" as const,
    status: "review" as const,
    pullRequest: 249,
    assignees: [agents.leo],
    activity: "Leo shared the PR on Slack",
  },
  {
    id: "gps",
    key: "ENG-2108",
    title: "Handle GPS dropouts gracefully",
    priority: "low" as const,
    status: "progress" as const,
    assignees: [agents.nina, agents.leo],
    activity: "Nina and Leo are working on it",
  },
];

export default function IssuesPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="relative flex aspect-square w-full max-w-[34rem] items-center justify-center rounded-sm p-12 sm:p-16">
        <div className="absolute inset-0 overflow-hidden rounded-sm">
          <ShaderBackground className="absolute inset-0" />
        </div>
        <div className="relative flex w-full justify-center">
          <Issues issues={issues} />
        </div>
      </div>
    </main>
  );
}
