import type { Metadata } from "next";
import { AgentComposer } from "@/components/agent-composer";
import { ShaderBackground } from "@/components/shader-background";

export const metadata: Metadata = {
  title: "Interactive agents",
};

export default function InteractiveAgentsPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="relative flex aspect-[3/4] w-full max-w-[34rem] items-center justify-center rounded-sm p-12 sm:p-16">
        <div className="absolute inset-0 overflow-hidden rounded-sm">
          <ShaderBackground className="absolute inset-0" />
        </div>
        <div className="relative w-full">
          <AgentComposer />
        </div>
      </div>
    </main>
  );
}
