import type { Metadata } from "next";
import { FilesChanged } from "@/components/files-changed";
import { ShaderBackground } from "@/components/shader-background";

export const metadata: Metadata = {
  title: "File changed",
};

const files = [
  { id: "globals", name: "globals.css", added: 8, removed: 0 },
  { id: "layout", name: "layout.tsx", added: 1, removed: 1 },
  { id: "modes-page", name: "modes-page.tsx", added: 1, removed: 1 },
  { id: "session-modes", name: "session-modes.tsx", added: 14, removed: 3 },
];

export default function FileChangedPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="relative flex aspect-square w-full max-w-[34rem] items-center justify-center rounded-sm p-12 sm:p-16">
        <div className="absolute inset-0 overflow-hidden rounded-sm">
          <ShaderBackground className="absolute inset-0" />
        </div>
        <div className="relative flex w-full justify-center">
          <FilesChanged files={files} />
        </div>
      </div>
    </main>
  );
}
