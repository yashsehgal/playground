import type { Metadata } from "next";
import { MessageQueue } from "@/components/message-queue";
export const metadata: Metadata = {
  title: "AI chat message queue",
};

export default function AiChatQueuePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="flex w-full max-w-[52rem] items-center justify-center p-12 sm:p-16">
        <div className="relative flex h-80 w-full max-w-[40rem] items-end">
          <MessageQueue />
        </div>
      </div>
    </main>
  );
}
