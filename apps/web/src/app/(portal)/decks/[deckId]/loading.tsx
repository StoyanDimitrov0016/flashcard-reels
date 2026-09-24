import { PageContainer } from "@/components/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeckLoading() {
  return (
    <PageContainer className="sm:py-8">
      <span className="sr-only" role="status">
        Loading deck
      </span>
      <Skeleton className="h-4 w-40" />
      <div className="mt-5 flex flex-col gap-6 md:flex-row md:justify-between">
        <div className="flex-1">
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
          <Skeleton className="mt-2 h-4 w-3/4 max-w-lg" />
          <div className="mt-4 flex gap-1.5">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton className="h-5 w-20" key={index} />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="order-2 space-y-2 lg:order-1">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton className="h-9 w-full" key={index} />
          ))}
        </div>
        <Skeleton className="order-1 h-[26rem] rounded-xl lg:order-2" />
      </div>
    </PageContainer>
  );
}
