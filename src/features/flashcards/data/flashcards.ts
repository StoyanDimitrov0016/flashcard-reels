import type { FlashcardFields } from "@/features/flashcards/domain/flashcard.model";
import { deckIdBySeedKey } from "@/features/decks/data/decks";
import { flashcardIdBySeedKey } from "@/features/flashcards/data/flashcard-ids";

const POC_TIMESTAMP = "2026-09-04T00:00:00.000Z";

const flashcardSeedSource = [
  {
    id: "closure",
    deckId: "javascript",
    question: "What is a closure?",
    answer:
      "A function bundled with access to its lexical environment, even after the outer function has returned.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "event-loop",
    deckId: "javascript",
    question: "What does the event loop do?",
    answer:
      "It coordinates the call stack and queued tasks, letting asynchronous callbacks run when the stack is empty.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-key",
    deckId: "web",
    question: "Why does React need stable keys?",
    answer:
      "Keys identify siblings across renders so React can preserve the right state and update only what changed.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "pure-function",
    deckId: "javascript",
    question: "What makes a function pure?",
    answer:
      "The same inputs always produce the same output, and evaluating it causes no observable side effects.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "big-o",
    deckId: "computer-science",
    question: "What does Big O describe?",
    answer:
      "An upper bound on how an algorithm's time or space grows as its input size approaches infinity.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "database-index",
    deckId: "web",
    question: "What trade-off does a database index make?",
    answer: "It spends storage and write performance to make matching reads substantially faster.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "http-idempotent",
    deckId: "web",
    question: "When is an HTTP method idempotent?",
    answer: "Repeating the same request has the same intended server effect as making it once.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "stack-heap",
    deckId: "computer-science",
    question: "How do the stack and heap differ?",
    answer:
      "The stack tracks scoped calls and local values; the heap holds dynamically allocated data with flexible lifetimes.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "race-condition",
    deckId: "computer-science",
    question: "What is a race condition?",
    answer:
      "A bug where behavior depends on the unpredictable ordering or timing of concurrent operations.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "dependency-inversion",
    deckId: "computer-science",
    question: "What is dependency inversion?",
    answer:
      "High-level policy and low-level details both depend on abstractions instead of depending directly on each other.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-prototype-chain",
    deckId: "javascript",
    question: "What is the prototype chain?",
    answer:
      "The linked sequence JavaScript follows to look up properties and methods when they are not found directly on an object.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-promise",
    deckId: "javascript",
    question: "What problem do promises solve?",
    answer:
      "They represent the eventual result of asynchronous work and provide composable success and error handling.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-state",
    deckId: "react",
    question: "Why should state updates be treated as immutable?",
    answer:
      "New references make changes predictable and let React detect when values should trigger a render.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-render",
    deckId: "react",
    question: "What causes a React component to render?",
    answer:
      "Its state changes, its parent renders with new props, or a consumed context value changes.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-effect",
    deckId: "react",
    question: "When should an effect be used in React?",
    answer:
      "Use an effect to synchronize with an external system such as a network connection, timer, or browser API.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "system-design-cache",
    deckId: "system-design",
    question: "What does a cache trade for lower latency?",
    answer:
      "It trades extra storage and invalidation complexity for faster reads and reduced load on the source system.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "system-design-queue",
    deckId: "system-design",
    question: "Why put a queue between services?",
    answer:
      "A queue decouples producers from consumers, absorbs traffic bursts, and enables asynchronous processing.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "system-design-consistency",
    deckId: "system-design",
    question: "What is eventual consistency?",
    answer:
      "Replicas may temporarily disagree, but converge to the same value when no newer updates occur.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "database-transaction",
    deckId: "databases",
    question: "What does atomicity guarantee?",
    answer: "A transaction's changes are applied as a whole or not applied at all.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "database-normalization",
    deckId: "databases",
    question: "Why normalize relational data?",
    answer:
      "Normalization reduces duplicated data and prevents update, insert, and delete anomalies.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-hoisting",
    deckId: "javascript",
    question: "What is hoisting in JavaScript?",
    answer:
      "It is the language behavior where declarations are processed before execution of their surrounding scope.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-let-const",
    deckId: "javascript",
    question: "How do let and const differ from var?",
    answer:
      "They are block-scoped and have a temporal dead zone; const also prevents reassignment of its binding.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-this",
    deckId: "javascript",
    question: "How is this determined in a regular function?",
    answer:
      "Its value is determined by the call site, such as a method call, constructor call, explicit binding, or plain call.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-arrow-this",
    deckId: "javascript",
    question: "How do arrow functions handle this?",
    answer:
      "They capture this lexically from the surrounding scope and do not create their own this binding.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-destructuring",
    deckId: "javascript",
    question: "What does destructuring provide?",
    answer:
      "It extracts values from arrays or object properties into local bindings using a concise pattern.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-spread-rest",
    deckId: "javascript",
    question: "What is the difference between spread and rest syntax?",
    answer:
      "Spread expands an iterable or object, while rest collects remaining values into an array or object.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-map-filter-reduce",
    deckId: "javascript",
    question: "How do map, filter, and reduce differ?",
    answer:
      "map transforms every item, filter keeps matching items, and reduce combines items into one accumulated result.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-nullish",
    deckId: "javascript",
    question: "When is nullish coalescing useful?",
    answer:
      "It supplies a fallback only when the left side is null or undefined, preserving valid falsy values such as 0 or false.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-modules",
    deckId: "javascript",
    question: "What is the benefit of JavaScript modules?",
    answer: "Modules isolate scope and make dependencies explicit through imports and exports.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-event-delegation",
    deckId: "javascript",
    question: "What is event delegation?",
    answer:
      "It attaches one handler to a common ancestor and uses event bubbling to handle events from its descendants.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-debounce",
    deckId: "javascript",
    question: "What does debouncing an event handler do?",
    answer:
      "It delays execution until a quiet period has passed, reducing repeated work during rapid input.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-async-await",
    deckId: "javascript",
    question: "What does async/await change about promise code?",
    answer:
      "It provides synchronous-looking syntax for pausing within an async function while the underlying work remains non-blocking.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-symbol",
    deckId: "javascript",
    question: "What is a JavaScript Symbol?",
    answer:
      "It is a primitive value commonly used as a unique property key that avoids accidental name collisions.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-weakmap",
    deckId: "javascript",
    question: "When is a WeakMap useful?",
    answer:
      "It associates data with object keys without preventing those keys from being garbage-collected.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "javascript-garbage-collection",
    deckId: "javascript",
    question: "What does garbage collection reclaim?",
    answer:
      "It reclaims memory occupied by values that are no longer reachable by the running program.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-rest-resource",
    deckId: "web",
    question: "What is a resource in a REST API?",
    answer:
      "It is a domain object or collection addressed by a stable URL and manipulated through standard HTTP semantics.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-http-status",
    deckId: "web",
    question: "What do HTTP status code classes communicate?",
    answer:
      "1xx is informational, 2xx is success, 3xx is redirection, 4xx is client error, and 5xx is server error.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-cors",
    deckId: "web",
    question: "What problem does CORS address?",
    answer: "It lets a server declare which browser origins may access its cross-origin responses.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-cookie",
    deckId: "web",
    question: "What is an HttpOnly cookie for?",
    answer:
      "It prevents client-side JavaScript from reading the cookie, reducing exposure to some cross-site scripting attacks.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-jwt",
    deckId: "web",
    question: "What does a signed JWT provide?",
    answer:
      "It allows a recipient to verify that claims were issued by a trusted signer and were not altered.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-rate-limit",
    deckId: "web",
    question: "Why rate-limit an API?",
    answer:
      "Rate limiting protects capacity, reduces abuse, and gives clients a predictable boundary for request volume.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-pagination",
    deckId: "web",
    question: "Why paginate a collection endpoint?",
    answer:
      "Pagination bounds response size and lets clients retrieve large collections incrementally.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-websocket",
    deckId: "web",
    question: "When is a WebSocket useful?",
    answer:
      "It supports long-lived, bidirectional communication when the server needs to push updates with low latency.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-idempotency-key",
    deckId: "web",
    question: "What does an idempotency key protect against?",
    answer:
      "It lets a server recognize retries of the same operation and avoid creating duplicate side effects.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-csrf",
    deckId: "web",
    question: "What is a CSRF attack?",
    answer:
      "It tricks a browser into sending an authenticated request to a site using credentials attached automatically by the browser.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-reverse-proxy",
    deckId: "web",
    question: "What does a reverse proxy do?",
    answer:
      "It receives requests for backend services and can route, cache, authenticate, or transform them before forwarding.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-load-balancer",
    deckId: "web",
    question: "What is the role of a load balancer?",
    answer:
      "It distributes traffic across multiple service instances to improve capacity, availability, or both.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-cache-control",
    deckId: "web",
    question: "What does Cache-Control: no-store mean?",
    answer: "It tells caches not to store the response for later reuse.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-dns",
    deckId: "web",
    question: "What does DNS resolve?",
    answer:
      "It maps human-readable domain names to records such as IP addresses and service locations.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-tls",
    deckId: "web",
    question: "What does TLS provide for HTTP traffic?",
    answer:
      "It provides encryption, server authentication, and integrity for data exchanged over the connection.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-api-versioning",
    deckId: "web",
    question: "Why version a public API?",
    answer:
      "Versioning lets a service evolve its contract while giving existing clients time to migrate.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "web-backpressure",
    deckId: "web",
    question: "What is backpressure?",
    answer:
      "It is a mechanism for slowing producers or buffering work when consumers cannot keep up.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-binary-search",
    deckId: "computer-science",
    question: "What condition does binary search require?",
    answer:
      "The search space must be ordered so each comparison can eliminate roughly half of the remaining candidates.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-hash-table",
    deckId: "computer-science",
    question: "How does a hash table provide fast lookup?",
    answer:
      "A hash function maps keys to buckets, giving average constant-time lookup when collisions remain bounded.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-queue-stack",
    deckId: "computer-science",
    question: "How does a queue differ from a stack?",
    answer: "A queue is first-in, first-out, while a stack is last-in, first-out.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-tree",
    deckId: "computer-science",
    question: "What is a tree data structure?",
    answer:
      "It is a hierarchical structure of nodes connected by edges, usually with one root and no cycles.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-graph",
    deckId: "computer-science",
    question: "What makes a graph directed?",
    answer:
      "Its edges have a direction, so an edge from one vertex to another does not necessarily imply the reverse edge.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-bfs-dfs",
    deckId: "computer-science",
    question: "How do breadth-first and depth-first search differ?",
    answer:
      "Breadth-first search explores by distance layers, while depth-first search follows a path as far as possible before backtracking.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-recursion",
    deckId: "computer-science",
    question: "What must a recursive algorithm include?",
    answer:
      "It needs a base case that stops recursion and a recursive step that moves the input toward that case.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-dynamic-programming",
    deckId: "computer-science",
    question: "When is dynamic programming useful?",
    answer:
      "It is useful when a problem has overlapping subproblems and optimal substructure that allow reusable partial results.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-greedy",
    deckId: "computer-science",
    question: "What is a greedy algorithm?",
    answer:
      "It repeatedly chooses the best-looking local option, relying on problem properties to make that choice globally valid.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-time-space",
    deckId: "computer-science",
    question: "What is a time-space trade-off?",
    answer:
      "An algorithm can often use more memory to reduce execution time, or more computation to save memory.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-process-thread",
    deckId: "computer-science",
    question: "How does a process differ from a thread?",
    answer:
      "A process has an isolated address space, while threads share a process's memory and resources.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-mutex",
    deckId: "computer-science",
    question: "What does a mutex protect?",
    answer:
      "It provides exclusive access to a shared resource so only one participating thread enters the protected section at a time.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-deadlock",
    deckId: "computer-science",
    question: "What is a deadlock?",
    answer:
      "It is a state where tasks wait forever because each holds a resource needed by another task.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-memory-leak",
    deckId: "computer-science",
    question: "What is a memory leak?",
    answer:
      "It occurs when a program retains memory that it no longer needs, causing usage to grow unnecessarily over time.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-endianness",
    deckId: "computer-science",
    question: "What does endianness describe?",
    answer: "It describes the order in which the bytes of a multi-byte value are stored in memory.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "cs-compiler",
    deckId: "computer-science",
    question: "What does a compiler do?",
    answer:
      "It translates source code into another representation, often machine code or an intermediate form that can be executed.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-component",
    deckId: "react",
    question: "What is a React component?",
    answer:
      "It is a reusable unit that describes part of a user interface from its inputs and state.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-props",
    deckId: "react",
    question: "What are React props?",
    answer:
      "Props are read-only inputs passed from a parent component to configure a child component.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-controlled",
    deckId: "react",
    question: "What is a controlled input?",
    answer:
      "Its current value is driven by React state, with changes reported through an event handler.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-uncontrolled",
    deckId: "react",
    question: "When might an uncontrolled input be useful?",
    answer:
      "It can be useful when the native element owns its value and the application only needs to read it at specific times.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-context",
    deckId: "react",
    question: "What problem does React context solve?",
    answer:
      "It makes a value available to descendants without passing it manually through every intermediate component.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-reducer",
    deckId: "react",
    question: "When is useReducer a good fit?",
    answer:
      "It helps organize complex state transitions as explicit actions handled by a reducer function.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-ref",
    deckId: "react",
    question: "What is a React ref used for?",
    answer:
      "It stores a mutable value across renders without causing a render, often for imperative handles or DOM/native views.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-list",
    deckId: "react",
    question: "What should a list key identify?",
    answer:
      "It should stably identify the item among its siblings across renders, rather than describe its current position.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-conditional",
    deckId: "react",
    question: "How does conditional rendering work in React?",
    answer: "A component returns different elements or null based on its current props and state.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-lifting",
    deckId: "react",
    question: "What does lifting state up mean?",
    answer:
      "It moves shared state to the closest common parent so related children can stay consistent.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-composition",
    deckId: "react",
    question: "What is component composition?",
    answer:
      "It builds flexible components by combining smaller components and passing content or behavior through props.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-error-boundary",
    deckId: "react",
    question: "What does an error boundary handle?",
    answer:
      "It catches rendering errors in a descendant tree and displays fallback UI instead of crashing that part of the interface.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-suspense",
    deckId: "react",
    question: "What does Suspense provide?",
    answer:
      "It lets a subtree show fallback content while a supported asynchronous dependency is not yet ready.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-strict-mode",
    deckId: "react",
    question: "What is the purpose of Strict Mode?",
    answer:
      "It enables development-only checks that expose unsafe patterns and side effects in components.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-compiler",
    deckId: "react",
    question: "What does the React Compiler optimize?",
    answer:
      "It can automatically optimize component reactivity so developers need less manual memoization.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-derived-state",
    deckId: "react",
    question: "Why avoid storing directly derived values in state?",
    answer:
      "Derived state can become stale or require synchronization; calculating it from the source state keeps one source of truth.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "react-hook-rules",
    deckId: "react",
    question: "What are the rules of Hooks?",
    answer:
      "Call Hooks only at the top level of React functions and only from React components or custom Hooks.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-availability",
    deckId: "system-design",
    question: "What does availability measure?",
    answer:
      "It measures how often a system is operational and able to respond successfully when requested.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-scalability",
    deckId: "system-design",
    question: "What does scalability describe?",
    answer:
      "It describes how effectively a system handles increased workload by adding resources or improving its design.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-horizontal",
    deckId: "system-design",
    question: "What is horizontal scaling?",
    answer:
      "It adds more service instances to share a workload instead of making one instance larger.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-vertical",
    deckId: "system-design",
    question: "What is vertical scaling?",
    answer:
      "It increases the CPU, memory, storage, or other capacity of an existing machine or instance.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-partitioning",
    deckId: "system-design",
    question: "Why partition a workload?",
    answer:
      "Partitioning splits data or work into independent portions so it can be distributed and managed more efficiently.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-replication",
    deckId: "system-design",
    question: "Why replicate data?",
    answer:
      "Replication can improve read capacity, availability, and geographic proximity at the cost of coordination complexity.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-sharding",
    deckId: "system-design",
    question: "What is database sharding?",
    answer:
      "It distributes rows across separate database partitions so storage and traffic can scale across nodes.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-circuit-breaker",
    deckId: "system-design",
    question: "What does a circuit breaker prevent?",
    answer:
      "It stops repeated calls to an unhealthy dependency and gives that dependency time to recover.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-retry",
    deckId: "system-design",
    question: "When can retries make an outage worse?",
    answer:
      "Unbounded or synchronized retries can amplify traffic against an already overloaded dependency.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-timeout",
    deckId: "system-design",
    question: "Why set timeouts on network calls?",
    answer:
      "Timeouts bound how long resources wait for a response and prevent slow dependencies from exhausting callers.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-observability",
    deckId: "system-design",
    question: "What are the three common pillars of observability?",
    answer:
      "They are logs, metrics, and traces, which describe events, aggregated behavior, and request paths respectively.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-cap-theorem",
    deckId: "system-design",
    question: "What trade-off does the CAP theorem describe?",
    answer:
      "During a network partition, a distributed system must trade between consistency and availability.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-leader-election",
    deckId: "system-design",
    question: "Why use leader election?",
    answer:
      "It chooses one coordinator among distributed nodes so a task has a clear owner at a given time.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-event-driven",
    deckId: "system-design",
    question: "What is an event-driven architecture?",
    answer:
      "Components communicate by publishing and consuming events that represent facts about changes in the system.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-outbox",
    deckId: "system-design",
    question: "What problem does the transactional outbox pattern solve?",
    answer:
      "It keeps a database change and the event describing it together so a separate publisher can deliver the event reliably.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-rate-limit",
    deckId: "system-design",
    question: "What is a token bucket rate limiter?",
    answer:
      "It adds tokens at a fixed rate and spends one for each request, allowing controlled bursts up to the bucket capacity.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "sd-blob-storage",
    deckId: "system-design",
    question: "When is object storage a good fit?",
    answer:
      "It is a good fit for large immutable or infrequently changed blobs such as images, videos, and backups.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-primary-key",
    deckId: "databases",
    question: "What does a primary key guarantee?",
    answer: "It uniquely identifies each row in a table and cannot be null.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-foreign-key",
    deckId: "databases",
    question: "What does a foreign key enforce?",
    answer:
      "It constrains a value to reference an existing key in another table, preserving a relationship between rows.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-join",
    deckId: "databases",
    question: "What does an inner join return?",
    answer: "It returns rows whose join condition matches in both participating tables.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-covering-index",
    deckId: "databases",
    question: "What is a covering index?",
    answer:
      "It contains all columns needed by a query, allowing the database to answer it without reading the table rows.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-composite-index",
    deckId: "databases",
    question: "What is a composite index?",
    answer:
      "It indexes multiple columns together, with query usefulness depending on the indexed column order and predicates.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-query-plan",
    deckId: "databases",
    question: "What is a query execution plan?",
    answer:
      "It describes the operations a database intends to use to execute a query, such as scans, joins, and index lookups.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-acid",
    deckId: "databases",
    question: "What does the ACID acronym represent?",
    answer:
      "Atomicity, consistency, isolation, and durability describe core transaction guarantees.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-isolation",
    deckId: "databases",
    question: "What does transaction isolation control?",
    answer:
      "It controls how much one concurrent transaction can observe of another transaction's intermediate work.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-deadlock",
    deckId: "databases",
    question: "How can database transactions deadlock?",
    answer:
      "Two transactions can each hold locks that the other needs, leaving both waiting indefinitely unless the database aborts one.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-optimistic-locking",
    deckId: "databases",
    question: "How does optimistic locking detect conflicts?",
    answer:
      "An update checks a version or timestamp and fails when another writer changed the row since it was read.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-pagination",
    deckId: "databases",
    question: "Why can cursor pagination outperform offset pagination?",
    answer:
      "A cursor can continue from an indexed position without scanning and skipping every preceding row.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-soft-delete",
    deckId: "databases",
    question: "What is a soft delete?",
    answer:
      "It marks a row as deleted instead of physically removing it, preserving history while requiring filtered queries.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-connection-pool",
    deckId: "databases",
    question: "Why use a database connection pool?",
    answer:
      "It reuses a bounded set of connections and avoids paying the setup cost for every request.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-replication",
    deckId: "databases",
    question: "What is read replication used for?",
    answer:
      "It sends copies of data to read replicas so read traffic can scale without sending every query to the writer.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-sharding",
    deckId: "databases",
    question: "What is a shard key?",
    answer: "It is the value used to decide which partition or database node stores a record.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-document",
    deckId: "databases",
    question: "What is a document database?",
    answer:
      "It stores records as document-shaped values, often allowing nested data and flexible schemas.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-oltp-olap",
    deckId: "databases",
    question: "How do OLTP and OLAP workloads differ?",
    answer:
      "OLTP handles many small operational transactions, while OLAP analyzes larger datasets through complex queries.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  {
    id: "db-migration",
    deckId: "databases",
    question: "What is a database migration?",
    answer:
      "It is a versioned change to database structure or data that can be applied consistently across environments.",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
];

export const flashcardSeedData: FlashcardFields[] = flashcardSeedSource.map((flashcard) => ({
  ...flashcard,
  deckId: getRequiredSeedId(deckIdBySeedKey, flashcard.deckId),
  id: getRequiredSeedId(flashcardIdBySeedKey, flashcard.id),
}));

function getRequiredSeedId<T>(ids: Readonly<Record<string, T>>, seedKey: string): T {
  const id = ids[seedKey];
  if (id === undefined) {
    throw new Error(`Missing generated ID for seed key ${seedKey}`);
  }
  return id;
}
