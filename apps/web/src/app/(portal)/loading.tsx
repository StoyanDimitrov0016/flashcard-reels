import { PageContainer } from "@/components/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogLoading() {
  return (
    <PageContainer>
      <span className="sr-only" role="status">
        Loading decks
      </span>
      <Skeleton className="h-9 w-32" />
      <Skeleton className="mt-3 h-5 w-80 max-w-full" />
      <div className="mt-8 flex items-center justify-between">
        <Skeleton className="h-10 w-full sm:max-w-sm" />
        <Skeleton className="hidden h-4 w-16 sm:block" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            className="flex min-h-56 flex-col rounded-xl border border-border bg-card p-5"
            key={index}
          >
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="mt-5 h-3.5 w-full" />
            <Skeleton className="mt-2 h-3.5 w-11/12" />
            <Skeleton className="mt-2 h-3.5 w-3/5" />
            <div className="mt-auto flex items-end justify-between pt-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="size-8" />
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
