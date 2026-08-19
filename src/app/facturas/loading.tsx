export default function FacturasLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="animate-pulse">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-48" />
          </div>
          <div className="animate-pulse">
            <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
          </div>
        </div>
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded w-28" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="animate-pulse flex items-center gap-4">
                <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-48 mb-2" />
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
                </div>
                <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
