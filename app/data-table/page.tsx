import type { Metadata } from "next";
import { DataTable } from "@/components/data-table";
import { ShaderBackground } from "@/components/shader-background";

export const metadata: Metadata = {
  title: "Data table",
};

export default function DataTablePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="relative flex w-max max-w-full items-center justify-center rounded-sm p-12 sm:p-16">
        <div className="absolute inset-0 overflow-hidden rounded-sm">
          <ShaderBackground className="absolute inset-0" />
        </div>
        <div className="relative w-max">
          <DataTable />
        </div>
      </div>
    </main>
  );
}
