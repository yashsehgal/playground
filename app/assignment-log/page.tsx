import type { Metadata } from "next";
import { AssignmentPlayback } from "@/components/assignee-menu";

export const metadata: Metadata = {
  title: "Assignment log",
};

export default function AssignmentLogPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-8">
      <AssignmentPlayback />
    </main>
  );
}
