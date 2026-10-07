# Conventions

How code in this repository is written. Lint enforces what it can; these cover the rest. Before
adding anything, read the nearest existing implementation and follow its shape. A new
organizational concept needs a reason the existing ones don't cover.

## Components

Use named function declarations. A component with props gets a `Readonly` `<Name>Props` type
directly above it, destructured in the signature. A component without props needs no type.

```tsx
type ProductListProps = Readonly<{
  products: Product[];
  onSelect: (productId: string) => void;
}>;

export function ProductList({ products, onSelect }: ProductListProps) {
  return <ul>{/* ... */}</ul>;
}

// Avoid: arrow components, inline prop types, missing Readonly.
export const ProductList = ({ products }: { products: Product[] }) => <ul />;
```

## Hooks

A hook that takes an object gets a `Readonly` `<NameWithoutUse>Options` type directly above it,
destructured in the signature. Hooks stay unconditional.

```ts
type ProductSearchOptions = Readonly<{ categoryId: string; query: string }>;

export function useProductSearch({ categoryId, query }: ProductSearchOptions) {
  // ...
}
```

## JSX stays in the returned tree

Derive conditions and data above the `return`; keep markup inside it. Extract substantial or
reused branches into named components at module scope. React allows JSX in variables; this is a
readability rule.

```tsx
// Avoid
const status = isConnected ? <Badge>Connected</Badge> : <Badge>Offline</Badge>;
return <Page>{status}</Page>;

// Prefer
return (
  <Page>
    <ConnectionStatus isConnected={isConnected} />
  </Page>
);
```

In non-trivial components and hooks, leave a blank line before the final `return`.

## Named effects

Name effect callbacks and their cleanups after why they exist.

```tsx
useEffect(
  function subscribeToConnectionChanges() {
    const unsubscribe = connection.subscribe(setStatus);

    return function unsubscribeFromConnectionChanges() {
      unsubscribe();
    };
  },
  [connection]
);
```

## Async control flow

Don't put `await` inside a ternary. Use `if` or an early return.

```ts
// Avoid
const profile = cached ? await loadCachedProfile() : await fetchProfile();

// Prefer
if (cached) {
  return await loadCachedProfile();
}

return await fetchProfile();
```

## Schemas and patterns

Zod schemas are PascalCase ending in `Schema`, with inferred types right next to them, never in a
separate types file. Meaningful regular expressions are named constants in PascalCase ending in
`Pattern`.

```ts
export const CustomerSchema = z.object({ id: z.string(), email: z.email() });
export type Customer = z.infer<typeof CustomerSchema>;

const InvitationCodePattern = /^[A-Z0-9]{8}$/;
```

## Filenames show architectural roles

When a module has a clear role, put it in the filename. Ports and implementations pair up:
`deck-progress.repository.ts` and `sqlite-deck-progress.repository.ts`, `deck.service.ts` and
`deck.service.impl.ts`, `deck-removal.transaction.ts` and `sqlite-deck-removal.transaction.ts`,
`archived-progress.query.ts`. Avoid `-manager`, `-helper`, and `-utils` for modules that are
really repositories or services.

## Layers and composition

Presentation calls application APIs; it never imports infrastructure or the global container. The
dependency matrix is in [architecture](architecture.md#mobile-layers).

Plain infrastructure factories build repositories, transactions, gateways, and services. A
feature factory returns what it builds and declares cross-feature inputs as named options.
`createAppServices` assembles them in dependency order, and React providers own only lifetime and
context. No mutable registries or service locators. Keep startup-only wiring separate when its
dependencies differ.

## Data access with TanStack Query

All app data goes through TanStack Query, including local SQLite services on mobile.

- Reads are `queryOptions` factories in a feature's `presentation/queries`; writes are
  `mutationOptions` factories in `presentation/mutations`. A factory takes `services` first. Every
  other input belongs in the key.
- Build keys from `queryScopes`. After a write, call `invalidateChangedData` once with all of its
  changes, from `onSuccess` through the context's `client`.
- Map load failures to view errors inside the query function. Queries throw to the route boundary
  by default. A query whose failure is shown in place sets `throwOnError: false` and
  `meta.errorReport`. Mutations report through `meta.errorReport`.
- Hooks stay thin: one `useQuery` call with defaults, or the `useMutation` result itself.
- Screen-only effects (navigation, haptics, toasts) go in `mutate` callbacks, so they don't run
  after unmount. To stop two calls in one tick, check `queryClient.isMutating(options)`, not
  `isPending`.
- `staleTime: "static"` blocks refetch even after invalidation; `Infinity` doesn't. Use `static`
  only for one-time results such as a started Focus session's identity.

`@tanstack/eslint-plugin-query` enforces the key and option rules in both apps.

```ts
export const lessonQueries = {
  detail: (services: LessonsCapability, lessonId: LessonId | null) =>
    queryOptions({
      queryKey: [...queryScopes.lessons, "detail", lessonId],
      queryFn: lessonId === null ? skipToken : () => services.lessonService.findById(lessonId),
    }),
};

export const deckMutations = {
  remove: (services: Pick<DecksCapability, "deckService">) =>
    mutationOptions({
      mutationKey: ["decks", "remove"],
      mutationFn: (deckId: DeckId) => services.deckService.remove(deckId),
      onSuccess: (_result, _deckId, _onMutateResult, { client }) => {
        void invalidateChangedData(client, ["deck-content", "learning-progress"]);
      },
      meta: { errorReport: "Deck delete failure" },
    }),
};
```

Never hand-write loading state, cancellation flags, or revision counters around a `useEffect`
fetch; that duplicates the library.

## Errors

Expected failures are typed errors with a stable code, a message, and an optional `cause` and
context. Catch only the errors you expect and let programming errors propagate. Test error
contracts at runtime instead of suppressing lint.

## Tests

Follow the [testing principles](principles.md#testing). In practice:

- Use fixed clocks, IDs, and local fixtures.
- Assert the resulting state and important side effects, not internal call order (unless order is
  the contract).
- Reproduce races with deferred promises, not timing.
- Don't add tests that restate a palette, a layout constant, an enum, or a one-line mapping.

The test layers and where each test goes are in the [testing guide](guides/testing.md).
