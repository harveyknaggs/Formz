export default function ListingSkeleton({ variant = 'detail' }) {
  if (variant === 'public') {
    return (
      <div className="min-h-screen bg-slate-50 pb-12">
        <div className="w-full h-64 sm:h-80 md:h-96 bg-slate-200 animate-pulse" />
        <div className="max-w-2xl mx-auto px-4 -mt-8 sm:-mt-12 relative">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 mb-6">
            <div className="h-7 w-3/4 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-slate-100 rounded mt-3 animate-pulse" />
            <div className="h-10 w-1/2 bg-slate-200 rounded mt-6 animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
              <div className="h-3 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-11/12 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-6">
            <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="space-y-3 mt-5">
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className="max-w-3xl">
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="h-7 w-48 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-72 bg-slate-100 rounded animate-pulse mb-6" />
        <div className="card space-y-5">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i}>
              <div className="h-3 w-24 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-4" />
      <div className="mb-6">
        <div className="h-7 w-2/3 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-slate-100 rounded mt-2 animate-pulse" />
      </div>
      <div className="card mb-6">
        <div className="w-full h-64 bg-slate-200 rounded-lg animate-pulse mb-6" />
        <div className="h-5 w-32 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
              <div className="h-6 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="card mb-6">
        <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
