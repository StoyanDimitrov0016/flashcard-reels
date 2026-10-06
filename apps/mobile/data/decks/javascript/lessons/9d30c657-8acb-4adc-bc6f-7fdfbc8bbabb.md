# Property keys and descriptors

`{ name: "Ada" }` looks like a simple lookup table, but every property in a JavaScript object is backed by more machinery than that: keys are restricted to specific types, each property carries hidden attributes controlling whether it can be changed or even seen, and a property doesn't have to store a plain value at all. Understanding this machinery explains why some properties resist being reassigned, why `Object.freeze` sometimes doesn't fully protect an object, and how libraries build computed properties.

## What can be a property key

An object **property key** is either a **string** or a **symbol** - nothing else. If you use a number as a key, JavaScript converts it to a string first:

```js
const obj = { 1: "a", x: "b" };
console.log(Object.keys(obj)); // ["1", "x"] - the number became a string key
```

This is why array indices are really just string keys under the hood (`"0"`, `"1"`, ...), and why `obj[1]` and `obj["1"]` reach the same property.

## Symbols as property keys

A **symbol** is a unique primitive, created with `Symbol("description")`. No two symbols are ever equal, even with the same description, which makes them useful as **collision-resistant** property keys - a symbol key can't accidentally clash with a string key some other code added, or with keys added later by a library. Symbols also back language protocols themselves, such as `Symbol.iterator`, which is how an object opts into `for...of`.

```js
const id = Symbol("id");
const record = { [id]: 42, name: "Ada" };
console.log(Object.keys(record)); // ["name"] - the symbol key is skipped
console.log(record[id]); // 42
```

Symbol-keyed properties are deliberately excluded from `Object.keys`, `for...in`, and `JSON.stringify` - they're meant for a specific piece of code to use privately, not for generic enumeration.

## Property descriptors

Every own property has more attributes than just its value. A **property descriptor** is the object describing those attributes: whether the property's `value` can be changed (`writable`), whether it shows up in `for...in`/`Object.keys` (`enumerable`), and whether the descriptor itself can later be changed or the property deleted (`configurable`) - or, for accessor properties, `get`/`set` functions instead of a `value`.

```js
const obj = {};
Object.defineProperty(obj, "id", {
  value: 42,
  writable: false,
  enumerable: true,
  configurable: false,
});
obj.id = 100; // silently ignored in non-strict code (throws in strict mode)
console.log(obj.id); // 42 - writable: false blocked the change
```

Ordinary property assignment (`obj.id = 42`) creates a descriptor with all of `writable`, `enumerable`, and `configurable` set to `true` by default. `Object.defineProperty` is how you deviate from those defaults.

## Data properties vs. accessor properties

A **data property** stores a plain `value` directly, as in every example so far. An **accessor property** instead runs **getter and/or setter functions** whenever the property is read or written - there's no stored value at all, just computation that runs on access.

```js
const person = {
  first: "Ada",
  last: "Lovelace",
  get fullName() {
    return `${this.first} ${this.last}`;
  },
  set fullName(value) {
    [this.first, this.last] = value.split(" ");
  },
};
console.log(person.fullName); // "Ada Lovelace" - computed by the getter
person.fullName = "Grace Hopper"; // runs the setter
console.log(person.first); // "Grace"
```

From the outside, `person.fullName` looks like an ordinary property; only the descriptor reveals that it's backed by functions instead of a stored value.

## Object.freeze

**`Object.freeze`** locks an object's own properties down all at once: no properties can be added or removed, no property can be reconfigured, and every existing data property becomes non-writable. It is essentially "make every own property behave like the `id` example above."

The catch is that the freeze is **shallow**: it only affects the object you called it on, not any objects nested inside it.

```js
const config = Object.freeze({ retries: 3, limits: { max: 10 } });
config.retries = 5; // ignored: top-level property is frozen
config.limits.max = 999; // succeeds: limits is a separate, unfrozen object
console.log(config.retries, config.limits.max); // 3 999
```

To freeze nested objects too, you must freeze each one individually (or write a recursive "deep freeze" helper).

## Common mistakes

- **Expecting `Object.freeze` to protect nested objects.** The freeze only reaches the object's own properties; a nested object needs its own `Object.freeze` call.
- **Using `Object.keys` or `JSON.stringify` and expecting symbol-keyed properties to appear.** They're intentionally excluded; access them directly by the symbol or with `Object.getOwnPropertySymbols`.
- **Forgetting that ordinary assignment already writes a full descriptor.** `obj.x = 1` is not "missing" `writable`/`enumerable`/`configurable` - they default to `true`; only `Object.defineProperty` lets you set them to `false`.

## Key points

- An object property key is a string or a symbol; numeric-looking keys are converted to strings.
- Symbols are unique, collision-resistant primitives often used as property keys or for protocols like iteration.
- A property descriptor controls a property's value or accessor functions, plus writability, enumerability, and configurability.
- A data property stores a value directly; an accessor property runs getter/setter functions on access instead.
- `Object.freeze` prevents adding, removing, or reconfiguring own properties and makes existing data properties non-writable, but the freeze is shallow - nested objects still need freezing separately.
