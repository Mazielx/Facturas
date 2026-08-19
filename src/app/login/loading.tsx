export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="animate-pulse">
          <div className="flex items-center justify-center mb-8">
            <div className="h-12 w-12 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
          </div>
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-48 mx-auto mb-2" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-64 mx-auto mb-8" />
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="space-y-4">
              <div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-24 mb-2" />
                <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
              </div>
              <div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-20 mb-2" />
                <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
              </div>
              <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
