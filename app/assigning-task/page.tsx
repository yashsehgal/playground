import type { Metadata } from "next";
import { Issues } from "@/components/issues";
import { ShaderBackground } from "@/components/shader-background";
import { agents } from "@/lib/agents";

export const metadata: Metadata = {
  title: "Assigning task to an agent",
};

const issue = {
  id: "eta",
  key: "ENG-2076",
  title: "Redesign v2 sidebar",
  priority: "high" as const,
  status: "todo" as const,
  assignees: [agents.leo],
  activity: "Leo shared the PR on Slack",
};

export default function AssigningTaskPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="relative flex aspect-square w-full max-w-[34rem] items-center justify-center rounded-sm p-12 sm:p-16">
        <div className="absolute inset-0 overflow-hidden rounded-sm">
          <ShaderBackground className="absolute inset-0" />
        </div>
        <div className="relative flex w-full justify-center">
          <Issues issues={[issue]} assignable />
        </div>
      </div>
    </main>
  );
}
