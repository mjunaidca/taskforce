export default function Loading() {
  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-taskflow-500 to-taskflow-600 rounded-full" />

            <div className="pl-6 flex items-center justify-between">
              <div>
                <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse mb-3" />
                <div className="h-5 w-96 bg-slate-200 rounded-lg animate-pulse" />
              </div>
              <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Organizations Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-xl border border-border p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-slate-200 rounded-lg animate-pulse" />
                <div className="flex-1">
                  <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse mb-2" />
                  <div className="h-4 w-24 bg-slate-200 rounded-lg animate-pulse" />
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-t border-b border-slate-100">
                <div className="h-6 w-20 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-4 w-24 bg-slate-200 rounded-lg animate-pulse" />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-10 bg-slate-200 rounded-lg animate-pulse" />
                <div className="flex-1 h-10 bg-slate-200 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
