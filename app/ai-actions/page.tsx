import type { Metadata } from "next";
import { DataTable } from "@/components/data-table";

export const metadata: Metadata = {
  title: "AI actions for table contents",
};

export default function AiActionsPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-max max-w-full overflow-x-auto">
        <DataTable />
      </div>
    </main>
  );
}
