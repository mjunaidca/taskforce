export function OrganizationCardSkeleton() {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-border/50 p-8 animate-pulse">
      {/* Header Section */}
      <div className="flex items-start gap-4 mb-6">
        {/* Logo Skeleton */}
        <div className="w-16 h-16 bg-slate-200 rounded-full flex-shrink-0" />

        {/* Name & Slug */}
        <div className="flex-1 min-w-0">
          <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
        </div>
      </div>

      {/* Metadata Section */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="h-6 w-20 bg-slate-200 rounded-full" />
        </div>
        <div className="h-4 w-24 bg-slate-200 rounded" />
      </div>

      {/* Actions Section */}
      <div className="flex gap-3">
        <div className="h-10 flex-1 bg-slate-200 rounded-lg" />
        <div className="h-10 w-24 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
}

export function OrganizationsListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <OrganizationCardSkeleton key={i} />
      ))}
    </div>
  );
}
