import { DataTable } from "../../components/data-table"

export default function Page() {
  return (
    <main className="grid min-h-svh place-items-center px-6 py-16">
      <div className="w-max max-w-full">
        <DataTable />
      </div>
    </main>
  )
}
