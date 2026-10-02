import type { Metadata } from "next";
import { ChatInput } from "@/components/chat-input";
import { ShaderBackground } from "@/components/shader-background";

export const metadata: Metadata = {
  title: "Chat input",
};

export default function ChatInputPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="relative flex aspect-[3/4] w-full max-w-[34rem] items-center justify-center rounded-sm p-12 sm:p-16">
        <div className="absolute inset-0 overflow-hidden rounded-sm">
          <ShaderBackground className="absolute inset-0" />
        </div>
        <div className="relative w-full">
          <ChatInput />
        </div>
      </div>
    </main>
  );
}
