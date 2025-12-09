export default function Loading() {
  return (
    <div className="py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse mb-3" />
          <div className="h-5 w-96 bg-slate-200 rounded-lg animate-pulse" />
        </div>

        {/* Tabs Skeleton */}
        <div className="mb-8 flex items-center gap-4 border-b border-border">
          <div className="h-10 w-24 bg-slate-200 rounded-t-lg animate-pulse" />
          <div className="h-10 w-24 bg-slate-200 rounded-t-lg animate-pulse" />
          <div className="h-10 w-32 bg-slate-200 rounded-t-lg animate-pulse" />
        </div>

        {/* Content Skeleton */}
        <div className="bg-white rounded-2xl shadow-xl border border-border p-8">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-5 w-32 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-10 w-full bg-slate-200 rounded-lg animate-pulse" />
              </div>
            ))}
            <div className="pt-6 border-t border-border">
              <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
