import { Suspense } from "react"
import FacturasContent from "./content"

export default function FacturasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-600 dark:border-zinc-400" />
        </div>
      }
    >
      <FacturasContent />
    </Suspense>
  )
}
