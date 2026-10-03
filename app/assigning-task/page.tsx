import type { Metadata } from "next";
import { ShaderBackground } from "@/components/shader-background";

export const metadata: Metadata = {
  title: "Assigning task to an agent",
};

export default function AssigningTaskPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="relative aspect-square w-full max-w-[34rem] rounded-sm">
        <div className="absolute inset-0 overflow-hidden rounded-sm">
          <ShaderBackground className="absolute inset-0" />
        </div>
      </div>
    </main>
  );
}
