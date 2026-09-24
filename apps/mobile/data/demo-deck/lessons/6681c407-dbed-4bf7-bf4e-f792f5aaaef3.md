# Values and types

Every piece of data a JavaScript program works with is a **value**: a number, a string, an
object, a function, `null`, or `undefined`. Each value has a type, and the type decides what you
can do with it.

## Primitives

**Primitives** are the simple building blocks: strings, numbers, booleans, `null`, `undefined`,
symbols, and bigints. They are **immutable**. You never change a primitive in place; operations
produce new values instead.

```js
const name = "reels";
const loud = name.toUpperCase(); // "REELS"; name is still "reels"
```

## Objects

**Objects** are mutable collections with identity. Two separate objects can hold the same data
and still not be equal, because equality compares _which_ object you have, not what is inside
it:

```js
({ a: 1 }) === { a: 1 }; // false: two different objects
```

Arrays and functions are objects too, which is why you can attach properties to a function.

## Why it matters

- Comparing primitives compares their values.
- Comparing objects compares their identity.
- Passing an object to a function lets the function change it; passing a primitive does not.
