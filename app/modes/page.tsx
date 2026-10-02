import type { Metadata } from "next";
import { SessionModes } from "@/components/session-modes";
import { ShaderBackground } from "@/components/shader-background";

export const metadata: Metadata = {
  title: "Modes",
};

export default function ModesPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="relative flex aspect-[3/4] w-full max-w-[34rem] items-center justify-center rounded-sm p-12 sm:p-16">
        <div className="absolute inset-0 overflow-hidden rounded-sm">
          <ShaderBackground className="absolute inset-0" />
        </div>
        <div className="relative flex w-full justify-center">
          <SessionModes />
        </div>
      </div>
    </main>
  );
}
