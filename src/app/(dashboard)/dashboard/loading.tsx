import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading alerts">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, row) => (
          <div key={row} className="flex items-center justify-between gap-4">
            {Array.from({ length: 5 }).map((_, col) => (
              <Skeleton key={col} className="h-8 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
