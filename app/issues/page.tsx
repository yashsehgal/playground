import type { Metadata } from "next";
import { Issues } from "@/components/issues";
import { ShaderBackground } from "@/components/shader-background";

export const metadata: Metadata = {
  title: "Issues",
};

const issues = [
  {
    id: "startup",
    key: "ENG-2498",
    title: "Improve app startup metrics",
    priority: "high" as const,
    status: "progress" as const,
  },
  {
    id: "regression",
    key: "ENG-2380",
    title: "Add startup regression alert",
    priority: "medium" as const,
    status: "progress" as const,
  },
  {
    id: "position",
    key: "ENG-2039",
    title: "Smooth vehicle position updates during slow networks",
    priority: "none" as const,
    status: "todo" as const,
  },
  {
    id: "eta",
    key: "ENG-2076",
    title: "Reduce ETA jitter",
    priority: "high" as const,
    status: "review" as const,
  },
  {
    id: "gps",
    key: "ENG-2108",
    title: "Handle GPS dropouts gracefully",
    priority: "low" as const,
    status: "review" as const,
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
