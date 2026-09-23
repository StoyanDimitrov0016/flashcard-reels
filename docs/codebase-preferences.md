# Codebase Preferences

## 1. React functional components

**Preference**

Use named function declarations for React components.

When a component accepts props, declare a `Readonly` `<ComponentName>Props` type directly above it and destructure the props in the function signature.

**Correct**

```tsx
type ProductListProps = Readonly<{
  products: Product[];
  onSelect: (productId: string) => void;
}>;

export function ProductList({ products, onSelect }: ProductListProps) {
  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          <button onClick={() => onSelect(product.id)}>{product.name}</button>
        </li>
      ))}
    </ul>
  );
}
```

A component without props does not need a props type.

```tsx
export function LoadingIndicator() {
  return <span>Loading...</span>;
}
```

**Incorrect**

```tsx
export const ProductList = ({ products }: ProductListProps) => {
  return <ul>{/* ... */}</ul>;
};
```

```tsx
export function ProductList({ products }: Readonly<{ products: Product[] }>) {
  return <ul>{/* ... */}</ul>;
}
```

```tsx
export function ProductList({ products }: { products: Product[] }) {
  return <ul>{/* ... */}</ul>;
}
```

## 2. Custom React hooks

**Preference**

When a custom hook accepts an object parameter, declare a `Readonly` `<HookNameWithoutUse>Options`
type directly above it and destructure the options in the signature.

A hook without arguments does not need an options type.

**Correct**

```ts
type ProductSearchOptions = Readonly<{
  categoryId: string;
  query: string;
}>;

export function useProductSearch({ categoryId, query }: ProductSearchOptions) {
  const products = useProducts(categoryId);

  return products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()));
}
```

```ts
export function useCurrentLocale() {
  return useContext(LocaleContext);
}
```

**Incorrect**

```ts
export function useProductSearch({ categoryId, query }: { categoryId: string; query: string }) {
  // ...
}
```

## 3. Responsibility boundaries

**Preference**

Keep domain, application, infrastructure, and presentation responsibilities separate.

Higher-level code should depend on appropriate abstractions rather than reaching directly into
infrastructure or global dependencies.

**Correct**

```tsx
export function CheckoutScreen() {
  const { cart, submitOrder } = useCheckout();

  return <CheckoutView cart={cart} onSubmit={submitOrder} />;
}
```

The persistence work stays behind the appropriate application boundary.

```ts
export async function submitOrder(order: Order) {
  await orderRepository.save(order);
  await paymentGateway.capture(order.payment);
}
```

**Incorrect**

```tsx
import { sqlOrderRepository } from "../infrastructure/sql-order-repository";
import { paymentClient } from "../infrastructure/payment-client";

export function CheckoutScreen() {
  async function submitOrder(order: Order) {
    await sqlOrderRepository.save(order);
    await paymentClient.capture(order.payment);
  }

  // ...
}
```

## 4. JSX variables

**Preference**

Do not store rendered JSX in local variables.

Keep JSX in the returned tree or extract a meaningful component when the UI represents a separate
responsibility.

**Correct**

```tsx
export function ProfilePage() {
  return (
    <Page>
      <ProfileHeader />
      <AccountDetails />
      <RecentActivity />
    </Page>
  );
}
```

Extract substantial conditional UI:

```tsx
type ConnectionStatusProps = Readonly<{
  isConnected: boolean;
}>;

function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  if (isConnected) {
    return <Badge>Connected</Badge>;
  }

  return <Badge>Offline</Badge>;
}
```

**Incorrect**

```tsx
export function ProfilePage() {
  const status = isConnected ? <Badge>Connected</Badge> : <Badge>Offline</Badge>;

  return (
    <Page>
      {status}
      <AccountDetails />
    </Page>
  );
}
```

## 5. Lifecycle callbacks

**Preference**

Give meaningful lifecycle callbacks names that communicate why the lifecycle exists.

Give directly returned cleanup functions meaningful names as well.

**Correct**

```tsx
useEffect(
  function synchronizePreferences() {
    void refreshPreferences();
  },
  [refreshPreferences]
);
```

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

**Incorrect**

```tsx
useEffect(() => {
  const unsubscribe = connection.subscribe(setStatus);

  return () => {
    unsubscribe();
  };
}, [connection]);
```

## 6. Async control flow

**Preference**

Do not bury `await` expressions inside ternary expressions.

Use explicit control flow so asynchronous branches are easy to follow.

**Correct**

```ts
let profile: Profile;

if (hasCachedProfile) {
  profile = await loadCachedProfile();
} else {
  profile = await fetchProfile();
}

return profile;
```

An early return is also appropriate:

```ts
if (hasCachedProfile) {
  return await loadCachedProfile();
}

return await fetchProfile();
```

**Incorrect**

```ts
const profile = hasCachedProfile ? await loadCachedProfile() : await fetchProfile();
```

## 7. Zod schemas

**Preference**

Use PascalCase names ending in `Schema` for Zod schemas.

Keep types directly inferred from a schema close to that schema.

**Correct**

```ts
export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export type Customer = z.infer<typeof CustomerSchema>;
```

Related schemas can remain together when they describe the same boundary.

```ts
export const AddressSchema = z.object({
  city: z.string(),
  country: z.string(),
});

export type Address = z.infer<typeof AddressSchema>;

export const CustomerSchema = z.object({
  id: z.string(),
  address: AddressSchema,
});

export type Customer = z.infer<typeof CustomerSchema>;
```

**Incorrect**

```ts
const customerValidator = z.object({
  id: z.string(),
});
```

```ts
// customer.schemas.ts
export const CustomerSchema = z.object({
  id: z.string(),
});

// customer.types.ts
export type Customer = z.infer<typeof CustomerSchema>;
```

## 8. Regular expressions

**Preference**

Extract meaningful regular expressions into named constants.

Use PascalCase names ending in `Pattern` so their purpose is visible where they are used.

**Correct**

```ts
const InvitationCodePattern = /^[A-Z0-9]{8}$/;

export function isValidInvitationCode(value: string) {
  return InvitationCodePattern.test(value);
}
```

```ts
const UrlSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(slug: string) {
  if (!UrlSlugPattern.test(slug)) {
    throw new Error("Invalid slug");
  }
}
```

**Incorrect**

```ts
export function isValidInvitationCode(value: string) {
  return /^[A-Z0-9]{8}$/.test(value);
}
```

## 9. Final return spacing

**Preference**

In non-trivial React components and hooks, visually separate setup or derived logic from the final
return.

**Correct**

```tsx
export function SearchResults() {
  const results = useSearchResults();
  const visibleResults = results.filter(isVisible);

  return <ResultList results={visibleResults} />;
}
```

```ts
export function useFilteredProducts() {
  const products = useProducts();
  const availableProducts = products.filter(isAvailable);

  return { products: availableProducts };
}
```

**Incorrect**

```tsx
export function SearchResults() {
  const results = useSearchResults();
  const visibleResults = results.filter(isVisible);
  return <ResultList results={visibleResults} />;
}
```

## 10. Architectural filenames

**Preference**

When a module has a clear architectural role, make that role visible in its filename.

**Correct**

```text
customer.repository.ts
customer.repository.sqlite.impl.ts

notification.service.ts
notification.service.impl.ts
```

For example:

```ts
// customer.repository.ts
export type CustomerRepository = Readonly<{
  findById(id: string): Promise<Customer | null>;
  save(customer: Customer): Promise<void>;
}>;
```

```ts
// customer.repository.sqlite.impl.ts
export function createSqliteCustomerRepository(database: Database): CustomerRepository {
  return {
    async findById(id) {
      // persistence implementation
    },

    async save(customer) {
      // persistence implementation
    },
  };
}
```

**Incorrect**

```text
customer-manager.ts
customer-helper.ts
customer-stuff.ts
```

when the module actually has a specific repository or service responsibility.

## 11. Follow existing implementation

**Preference**

Before making changes, inspect the relevant existing implementation and nearby patterns.

Use good existing code as the primary reference for structure, naming, responsibility boundaries,
and conventions.

**Correct**

Before adding:

```text
features/orders/presentation/controllers/use-cancel-order.ts
```

inspect similar existing implementations:

```text
features/orders/presentation/controllers/use-create-order.ts
features/orders/presentation/controllers/use-update-order.ts
```

Then follow the established shape when it fits:

```ts
type CancelOrderOptions = Readonly<{
  orderId: string;
  onCancelled: () => void;
}>;

export function useCancelOrder({ orderId, onCancelled }: CancelOrderOptions) {
  const cancelOrder = useCancelOrderCommand();

  async function cancel() {
    await cancelOrder(orderId);
    onCancelled();
  }

  return { cancel };
}
```

**Incorrect**

Introducing another organizational concept without first checking whether the existing one already
covers the responsibility:

```text
presentation/
  controllers/
  handlers/
  managers/
  processors/
```

## 12. Tests protect behavior

**Preference**

Spend test time on user-visible outcomes, durable data invariants, failure recovery, and boundaries
that can corrupt or discard data. A test should describe a regression a user or another system
would notice. Prefer a small realistic scenario through the public service and SQLite boundary over
assertions that repeat a private helper's steps.

Use fixed clocks, IDs, and local fixtures so tests stay deterministic. Mock external or native
boundaries when needed, but keep the domain logic and persistence real. Assert the resulting state
and important side effects; avoid asserting internal call order unless that order is the contract.

Do not add tests that merely restate a palette, a layout constant, an enum, or a one-line mapping.
Visual layout belongs in device review or a scenario that checks the interaction it enables. Keep
tests of actual invariants, such as readable color contrast or preserved progress after a failed
restore.

For each new test, ask: "Which plausible bug would make this fail?" If the answer is only a rename
or an intentional implementation change with no behavior change, revise or omit the test.
