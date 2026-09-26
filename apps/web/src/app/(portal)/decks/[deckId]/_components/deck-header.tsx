import Link from "next/link";

import type { DeckSummary } from "@/server/decks";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type DeckHeaderProps = Readonly<{ deck: Pick<DeckSummary, "description" | "title"> }>;

export function DeckHeader({ deck }: DeckHeaderProps) {
  return (
    <header>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Decks</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{deck.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{deck.title}</h1>
      <p className="mt-1.5 max-w-2xl leading-6 text-muted-foreground">{deck.description}</p>
    </header>
  );
}
