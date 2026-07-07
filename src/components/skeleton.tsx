import { cn } from "@/lib/utils"

/** A single glass skeleton block with a slow left-to-right sheen. */
export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("skeleton block rounded-md", className)} aria-hidden="true" />
}

/** A server-row shaped skeleton, used while the Locations catalogue loads. */
export function ServerRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <Skeleton className="h-4 w-8" />
    </div>
  )
}

/** A group of server-row skeletons inside a card, capped so it never loops forever. */
export function ServerListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={i !== rows - 1 ? "border-b border-border/60" : ""}>
          <ServerRowSkeleton />
        </div>
      ))}
    </div>
  )
}
